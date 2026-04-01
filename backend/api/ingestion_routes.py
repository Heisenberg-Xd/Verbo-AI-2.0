"""
api/ingestion_routes.py
──────────────────────────────────────────────────────────
FastAPI router for all automated ingestion endpoints:

  Authentication:
    GET  /auth/google               → redirect to Google OAuth
    GET  /auth/google/callback      → handle OAuth callback

  Drive Status & Folders:
    GET  /drive/status              → check auth + connection state
    GET  /drive/folders             → list user's Drive folders
    POST /drive/sync                → manually trigger sync for all folders

  Folder Mappings:
    POST   /drive/map-folder        → map Drive folder → workspace
    GET    /drive/mappings          → list all current mappings
    DELETE /drive/mappings/{id}     → remove a mapping

  Ingestion Info:
    GET  /ingest/stats              → file hash count, ingested file list
"""

import os
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class MapFolderRequest(BaseModel):
    folder_id:   str
    workspace_id: str
    folder_name: str = ""


# ─────────────────────────────────────────────
# GOOGLE OAUTH ENDPOINTS
# ─────────────────────────────────────────────
@router.get("/auth/google", tags=["Drive Auth"])
async def google_auth_redirect():
    """
    Redirect the browser to Google's OAuth consent screen.
    The user will log in and grant access to their Drive.
    """
    try:
        from gdrive_sync import get_authorization_url
        url = get_authorization_url()
        return RedirectResponse(url)
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Google OAuth not configured: {e}. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/google/callback", tags=["Drive Auth"])
async def google_auth_callback(request: Request):
    """
    Receive OAuth authorization code from Google,
    exchange it for tokens, and redirect back to the frontend Drive page.
    """
    code  = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(f"{frontend_url}/app/drive?error={error}")

    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code parameter")

    try:
        from gdrive_sync import exchange_code_for_tokens
        tokens = exchange_code_for_tokens(code)
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(f"{frontend_url}/app/drive?connected=true")
    except Exception as e:
        logger.error(f"[IngestRoutes] OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {e}")


# ─────────────────────────────────────────────
# DRIVE STATUS & FOLDERS
# ─────────────────────────────────────────────
@router.get("/drive/status", tags=["Drive"])
async def drive_connection_status():
    """Check whether the user has connected their Google Drive."""
    from metadata_store import get_oauth_tokens
    tokens = get_oauth_tokens()
    return JSONResponse({
        "connected": tokens is not None,
        "has_client_id":     bool(os.environ.get("GOOGLE_CLIENT_ID")),
        "has_client_secret": bool(os.environ.get("GOOGLE_CLIENT_SECRET")),
        "auth_url": "/auth/google",
    })


@router.get("/drive/folders", tags=["Drive"])
async def list_drive_folders():
    """List all Google Drive folders accessible to the authenticated user."""
    try:
        from gdrive_sync import list_user_folders
        folders = list_user_folders()
        return JSONResponse({"folders": folders, "total": len(folders)})
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"[IngestRoutes] list_drive_folders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drive/disconnect", tags=["Drive Auth"])
async def disconnect_drive():
    """Disconnect from Google Drive by clearing stored tokens."""
    from metadata_store import clear_oauth_tokens
    clear_oauth_tokens()
    return JSONResponse({"status": "disconnected", "message": "Google Drive tokens cleared."})


# ─────────────────────────────────────────────
# FOLDER MAPPINGS
# ─────────────────────────────────────────────
@router.post("/drive/map-folder", tags=["Drive"])
async def map_folder_to_workspace(req: MapFolderRequest):
    """
    Map a Google Drive folder to a VerboAI workspace.
    Files in the folder will be auto-synced to that workspace.
    """
    from metadata_store import add_folder_mapping
    add_folder_mapping(req.folder_id, req.workspace_id, req.folder_name)
    return JSONResponse({
        "status":      "mapped",
        "folder_id":   req.folder_id,
        "folder_name": req.folder_name,
        "workspace_id": req.workspace_id,
        "message":     f"Folder '{req.folder_name or req.folder_id}' mapped to workspace '{req.workspace_id}'. Sync will run in ~90s."
    })


@router.get("/drive/mappings", tags=["Drive"])
async def list_folder_mappings():
    """Return all folder → workspace mappings."""
    from metadata_store import get_folder_mappings
    mappings = get_folder_mappings()
    formatted = [
        {
            "folder_id":    fid,
            "workspace_id": info.get("workspace_id") if isinstance(info, dict) else info,
            "folder_name":  info.get("folder_name", "") if isinstance(info, dict) else "",
        }
        for fid, info in mappings.items()
    ]
    return JSONResponse({"mappings": formatted, "total": len(formatted)})


@router.delete("/drive/mappings/{folder_id}", tags=["Drive"])
async def remove_folder_mapping(folder_id: str):
    """Remove a folder → workspace mapping."""
    from metadata_store import remove_folder_mapping
    remove_folder_mapping(folder_id)
    return JSONResponse({"status": "removed", "folder_id": folder_id})


# ─────────────────────────────────────────────
# MANUAL SYNC TRIGGER
# ─────────────────────────────────────────────
@router.post("/drive/sync", tags=["Drive"])
async def trigger_manual_sync():
    """Manually trigger a sync of all mapped Drive folders."""
    from metadata_store import get_folder_mappings, get_oauth_tokens
    if not get_oauth_tokens():
        raise HTTPException(status_code=401, detail="Not connected to Google Drive. Visit /auth/google.")

    mappings = get_folder_mappings()
    if not mappings:
        return JSONResponse({"status": "no_mappings", "message": "No folders mapped. Map a Drive folder first."})

    results = {}
    for folder_id, info in mappings.items():
        ws_id = info.get("workspace_id") if isinstance(info, dict) else info
        try:
            from gdrive_sync import sync_folder
            synced = sync_folder(folder_id, ws_id)
            if synced:
                try:
                    import requests
                    requests.post(
                        "http://127.0.0.1:8000/process",
                        json={"workspace_id": ws_id, "file_paths": []},
                        timeout=2
                    )
                except requests.exceptions.ReadTimeout:
                    pass
                except Exception as req_err:
                    logger.error(f"[Sync] Failed to trigger pipeline for {folder_id}: {req_err}")
                    
            results[folder_id] = {"status": "ok", "synced_count": len(synced), "files": synced}
        except Exception as e:
            results[folder_id] = {"status": "error", "message": str(e)}

    return JSONResponse({"status": "done", "results": results})


# ─────────────────────────────────────────────
# INGESTION STATS
# ─────────────────────────────────────────────
@router.get("/ingest/stats", tags=["Ingestion"])
async def ingestion_stats():
    """Return stats about ingested files (deduplication registry)."""
    from metadata_store import get_all_hashes
    hashes = get_all_hashes()
    return JSONResponse({
        "total_ingested": len(hashes),
        "files": [
            {
                "hash":        h[:12] + "...",
                "path":        v.get("path", ""),
                "workspace_id": v.get("workspace_id", ""),
                "ingested_at": v.get("ingested_at", ""),
            }
            for h, v in hashes.items()
        ]
    })
