"""
gdrive_sync.py
──────────────────────────────────────────────────────────
Full Google Drive OAuth 2.0 integration + background sync engine.

Key capabilities:
  - OAuth 2.0 flow (authorization URL generation + code exchange)
  - Token refresh (transparent)
  - List user's Drive folders
  - Download files from mapped folders
  - Background poller: syncs every 90 seconds

Environment variables required:
  GOOGLE_CLIENT_ID        — from Google Cloud Console
  GOOGLE_CLIENT_SECRET    — from Google Cloud Console
  GOOGLE_REDIRECT_URI     — defaults to http://localhost:8000/auth/google/callback
"""

import os
import io
import time
import logging
import threading
from typing import Optional, List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL  = os.environ.get("FRONTEND_URL", "http://localhost:3000")
SCOPES        = ["https://www.googleapis.com/auth/drive.readonly"]
SYNC_INTERVAL = 90   # seconds between Drive polls

_sync_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()

SUPPORTED_MIME_TYPES = {
    "text/plain":                              "text",
    "application/vnd.google-apps.document":   "gdoc",
}


# ─────────────────────────────────────────────
# OAUTH HELPERS
# ─────────────────────────────────────────────
def get_authorization_url() -> str:
    """
    Build the Google OAuth consent screen URL WITHOUT PKCE.
    Uses urllib directly so there is no code_verifier state to persist.
    """
    if not CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID not set in environment")

    import urllib.parse
    params = {
        "client_id":     CLIENT_ID,
        "redirect_uri":  REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",
        "prompt":        "consent",
    }
    return "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """
    Exchange an OAuth authorization code for access/refresh tokens.
    Uses requests directly — no PKCE, stateless, server-safe.
    Persists tokens to metadata.json.
    """
    import requests as req_lib
    resp = req_lib.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code":          code,
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri":  REDIRECT_URI,
            "grant_type":    "authorization_code",
        },
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Token exchange failed: {resp.status_code} {resp.text}")

    token_data = resp.json()
    tokens = {
        "access_token":  token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "token_expiry":  None,
    }

    from metadata_store import save_oauth_tokens
    save_oauth_tokens(tokens["access_token"], tokens["refresh_token"], tokens["token_expiry"])
    logger.info("[GDriveSync] OAuth tokens stored.")
    return tokens


# ─────────────────────────────────────────────
# AUTHENTICATED SERVICE BUILDER
# ─────────────────────────────────────────────
def _build_service(tokens: Dict[str, Any]):
    """Build an authenticated Drive API client from stored tokens."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token         = tokens["access_token"],
        refresh_token = tokens.get("refresh_token"),
        client_id     = CLIENT_ID,
        client_secret = CLIENT_SECRET,
        token_uri     = "https://oauth2.googleapis.com/token",
    )
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        from metadata_store import save_oauth_tokens
        save_oauth_tokens(creds.token, creds.refresh_token, str(creds.expiry))

    return build("drive", "v3", credentials=creds, cache_discovery=False)


# ─────────────────────────────────────────────
# DRIVE FOLDER LISTING
# ─────────────────────────────────────────────
def list_user_folders() -> List[Dict[str, Any]]:
    """
    Return all Drive folders accessible to the authenticated user.
    Returns list of {id, name}.
    """
    from metadata_store import get_oauth_tokens
    tokens = get_oauth_tokens()
    if not tokens:
        raise RuntimeError("Not authenticated with Google Drive. Complete OAuth first.")

    try:
        service = _build_service(tokens)
        results = service.files().list(
            q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields="files(id, name)",
            pageSize=100,
        ).execute()
        return results.get("files", [])
    except Exception as e:
        logger.error(f"[GDriveSync] list_user_folders error: {e}")
        raise RuntimeError(f"Could not list Drive folders: {e}")


# ─────────────────────────────────────────────
# FILE SYNC (single folder)
# ─────────────────────────────────────────────
def sync_folder(folder_id: str, workspace_id: str) -> List[str]:
    """
    Download new (non-duplicate) files from a Drive folder and ingest them.
    Returns list of ingested file names.
    """
    from metadata_store import get_oauth_tokens
    tokens = get_oauth_tokens()
    if not tokens:
        logger.warning("[GDriveSync] No OAuth tokens — skipping sync.")
        return []

    try:
        service = _build_service(tokens)
    except Exception as e:
        logger.error(f"[GDriveSync] Auth error: {e}")
        return []

    # List files in this folder
    try:
        results = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="files(id, name, mimeType)",
            pageSize=50,
        ).execute()
        files = results.get("files", [])
    except Exception as e:
        logger.error(f"[GDriveSync] list error for folder {folder_id}: {e}")
        return []

    ingested = []
    for f in files:
        mime = f["mimeType"]
        if mime not in SUPPORTED_MIME_TYPES:
            continue

        file_id   = f["id"]
        file_name = f["name"]
        save_name = "drive_" + os.path.splitext(file_name)[0] + ".txt"

        try:
            if mime == "application/vnd.google-apps.document":
                content = service.files().export(fileId=file_id, mimeType="text/plain").execute()
            else:
                content = service.files().get_media(fileId=file_id).execute()

            text = content.decode("utf-8") if isinstance(content, bytes) else str(content)
            if not text.strip():
                continue

            # Use ingest_text — handles dedup + pipeline + workspace
            from ingestion_pipeline import ingest_text
            result = ingest_text(text, save_name, workspace_id)

            if result["status"] == "ingested":
                ingested.append(save_name)
                logger.info(f"[GDriveSync] ✓ Synced: {save_name}")
            elif result["status"] == "duplicate":
                logger.debug(f"[GDriveSync] Duplicate skipped: {save_name}")

        except Exception as e:
            logger.warning(f"[GDriveSync] Failed to sync '{file_name}': {e}")

    return ingested


# ─────────────────────────────────────────────
# BACKGROUND SYNC POLLER
# ─────────────────────────────────────────────
def _sync_loop():
    """Background loop: syncs all mapped folders every SYNC_INTERVAL seconds."""
    logger.info(f"[GDriveSync] Background poller started (interval={SYNC_INTERVAL}s)")
    while not _stop_event.wait(timeout=SYNC_INTERVAL):
        try:
            from metadata_store import get_folder_mappings, get_oauth_tokens
            if not get_oauth_tokens():
                continue   # Not yet authenticated — quietly skip

            mappings = get_folder_mappings()
            if not mappings:
                continue

            for folder_id, info in mappings.items():
                ws_id = info.get("workspace_id") if isinstance(info, dict) else info
                try:
                    synced = sync_folder(folder_id, ws_id)
                    if synced:
                        logger.info(f"[GDriveSync] Synced {len(synced)} new files from folder {folder_id}")
                except Exception as e:
                    logger.warning(f"[GDriveSync] Folder {folder_id} sync error: {e}")
        except Exception as e:
            logger.error(f"[GDriveSync] Poller error: {e}")

    logger.info("[GDriveSync] Background poller stopped.")


def start_gdrive_sync():
    """Start the background Drive sync poller thread."""
    global _sync_thread, _stop_event
    _stop_event.clear()
    _sync_thread = threading.Thread(
        target=_sync_loop,
        daemon=True,
        name="gdrive-sync-poller"
    )
    _sync_thread.start()
    logger.info("[GDriveSync] ✓ Sync poller scheduled.")


def stop_gdrive_sync():
    """Stop the background Drive sync poller."""
    _stop_event.set()
    if _sync_thread and _sync_thread.is_alive():
        _sync_thread.join(timeout=5)
        logger.info("[GDriveSync] Stopped.")
