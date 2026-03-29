"""
metadata_store.py
──────────────────────────────────────────────────────────
Persistent flat-file metadata store for VerboAI ingestion.

Stores:
  - Ingested file hashes  (for deduplication)
  - Google Drive OAuth tokens
  - Folder → Workspace mappings

No database required — uses a single metadata.json file.
Thread-safe via a simple file lock.
"""

import os
import json
import threading
from typing import Optional, Dict, Any

METADATA_PATH = "metadata.json"
_lock = threading.Lock()

_DEFAULT_STRUCTURE = {
    "files": {},                  # {sha256_hash: {path, workspace_id, ingested_at}}
    "drive_connections": {
        "user_default": {
            "access_token": None,
            "refresh_token": None,
            "token_expiry": None,
            "folders": {}         # {folder_id: workspace_id}
        }
    }
}


# ─────────────────────────────────────────────
# CORE LOAD / SAVE
# ─────────────────────────────────────────────
def _load() -> dict:
    """Load metadata from disk. Creates file if missing."""
    if not os.path.exists(METADATA_PATH):
        return json.loads(json.dumps(_DEFAULT_STRUCTURE))
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure top-level keys exist (forward-compatibility)
        for k, v in _DEFAULT_STRUCTURE.items():
            data.setdefault(k, v)
        return data
    except Exception:
        return json.loads(json.dumps(_DEFAULT_STRUCTURE))


def _save(data: dict):
    """Persist metadata to disk."""
    try:
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"[MetadataStore] Failed to save: {e}")


# ─────────────────────────────────────────────
# FILE HASH REGISTRY (deduplication)
# ─────────────────────────────────────────────
def is_hash_registered(file_hash: str) -> bool:
    """Return True if this hash was already ingested."""
    with _lock:
        data = _load()
        return file_hash in data.get("files", {})


def register_hash(file_hash: str, file_path: str, workspace_id: str):
    """Record that a file with this hash has been ingested."""
    from datetime import datetime
    with _lock:
        data = _load()
        data.setdefault("files", {})[file_hash] = {
            "path":         file_path,
            "workspace_id": workspace_id,
            "ingested_at":  datetime.utcnow().isoformat(),
        }
        _save(data)


def get_all_hashes() -> Dict[str, dict]:
    """Return all registered file hashes."""
    with _lock:
        return _load().get("files", {})


# ─────────────────────────────────────────────
# OAUTH TOKENS
# ─────────────────────────────────────────────
def save_oauth_tokens(access_token: str, refresh_token: Optional[str], expiry: Optional[str] = None):
    """Persist Google OAuth tokens for the default user."""
    with _lock:
        data = _load()
        conn = data.setdefault("drive_connections", {}).setdefault("user_default", {})
        conn["access_token"]  = access_token
        conn["refresh_token"] = refresh_token
        conn["token_expiry"]  = expiry
        _save(data)


def get_oauth_tokens() -> Optional[Dict[str, Any]]:
    """Retrieve stored OAuth tokens. Returns None if not connected."""
    with _lock:
        data = _load()
        conn = data.get("drive_connections", {}).get("user_default", {})
        if not conn.get("access_token"):
            return None
        return {
            "access_token":  conn["access_token"],
            "refresh_token": conn.get("refresh_token"),
            "token_expiry":  conn.get("token_expiry"),
        }


def clear_oauth_tokens():
    """Remove stored OAuth tokens (disconnect from Drive)."""
    with _lock:
        data = _load()
        conn = data.setdefault("drive_connections", {}).setdefault("user_default", {})
        conn["access_token"]  = None
        conn["refresh_token"] = None
        conn["token_expiry"]  = None
        _save(data)


# ─────────────────────────────────────────────
# FOLDER → WORKSPACE MAPPINGS
# ─────────────────────────────────────────────
def add_folder_mapping(folder_id: str, workspace_id: str, folder_name: str = ""):
    """Map a Google Drive folder_id to a workspace_id."""
    with _lock:
        data = _load()
        folders = data.setdefault("drive_connections", {}) \
                       .setdefault("user_default", {}) \
                       .setdefault("folders", {})
        folders[folder_id] = {
            "workspace_id": workspace_id,
            "folder_name":  folder_name,
        }
        _save(data)


def remove_folder_mapping(folder_id: str):
    """Remove a folder mapping."""
    with _lock:
        data = _load()
        folders = data.get("drive_connections", {}) \
                       .get("user_default", {}) \
                       .get("folders", {})
        folders.pop(folder_id, None)
        _save(data)


def get_folder_mappings() -> Dict[str, dict]:
    """Return all folder_id → {workspace_id, folder_name} mappings."""
    with _lock:
        data = _load()
        return data.get("drive_connections", {}) \
                   .get("user_default", {}) \
                   .get("folders", {})
