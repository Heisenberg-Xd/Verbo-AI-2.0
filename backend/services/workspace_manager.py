"""
services/workspace_manager.py
──────────────────────────────────────────────────────────
Workspace-level isolation for VerboAI.
Each workspace is an independent document intelligence container.
No existing main.py logic is modified — this is purely additive.
"""

import uuid
import json
import os
from datetime import datetime
from typing import Dict, Optional, List

# ── In-memory store (survives as long as the server is running) ──────────────
_workspaces: Dict[str, dict] = {}

WORKSPACE_PERSIST_PATH = "workspaces.json"


# ─────────────────────────────────────────────
# PERSISTENCE HELPERS  (optional file-based)
# ─────────────────────────────────────────────
def _save_workspaces():
    """Persist workspace metadata (not document data) to disk."""
    try:
        serializable = {}
        for wid, ws in _workspaces.items():
            serializable[wid] = {
                k: v for k, v in ws.items()
                if k not in ("entities", "relationships", "rag_store_ref")
            }
        with open(WORKSPACE_PERSIST_PATH, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, default=str)
    except Exception:
        pass  # Never crash the main pipeline


def _load_workspaces():
    """Load persisted workspace metadata on startup."""
    global _workspaces
    if not os.path.exists(WORKSPACE_PERSIST_PATH):
        return
    try:
        with open(WORKSPACE_PERSIST_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for wid, ws in data.items():
            if wid not in _workspaces:
                _workspaces[wid] = ws
                # Re-initialise empty in-memory fields
                _workspaces[wid].setdefault("entities", [])
                _workspaces[wid].setdefault("relationships", [])
                _workspaces[wid].setdefault("document_texts", {})
                _workspaces[wid].setdefault("cluster_insights", [])
    except Exception:
        pass


# Load on import
_load_workspaces()


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────
def create_workspace(name: str, description: str = "") -> dict:
    """Create and register a new workspace. Returns the workspace dict."""
    workspace_id = str(uuid.uuid4())[:8]
    workspace = {
        "workspace_id": workspace_id,
        "name": name,
        "description": description,
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
        # Runtime data (not persisted)
        "file_names": [],
        "document_texts": {},     # {filename: raw_text}
        "cluster_insights": [],
        "entities": [],
        "relationships": [],
        "drive_connected": False,
        "drive_folder_id": None,
    }
    _workspaces[workspace_id] = workspace
    _save_workspaces()
    return workspace


def get_workspace(workspace_id: str) -> Optional[dict]:
    """Retrieve a workspace by ID. Returns None if not found."""
    return _workspaces.get(workspace_id)


def delete_workspace(workspace_id: str) -> bool:
    """Delete a workspace from the in-memory store and persist."""
    if workspace_id in _workspaces:
        del _workspaces[workspace_id]
        _save_workspaces()
        return True
    return False


def clear_workspaces() -> int:
    """Delete all workspaces from the in-memory store and persist. Returns the total count deleted."""
    global _workspaces
    count = len(_workspaces)
    _workspaces.clear()
    _save_workspaces()
    return count


def list_workspaces() -> List[dict]:
    """Return all workspaces as a list (runtime fields stripped for size)."""
    result = []
    for ws in _workspaces.values():
        result.append({
            "workspace_id": ws["workspace_id"],
            "name": ws["name"],
            "description": ws.get("description", ""),
            "created_at": ws.get("created_at"),
            "status": ws.get("status", "active"),
            "document_count": len(ws.get("file_names", [])),
            "entity_count": len(ws.get("entities", [])),
            "relationship_count": len(ws.get("relationships", [])),
            "drive_connected": ws.get("drive_connected", False),
        })
    return result


def update_workspace_documents(workspace_id: str, file_names: list, document_texts: dict):
    """Attach processed document data to a workspace."""
    ws = _workspaces.get(workspace_id)
    if not ws:
        return
    ws["file_names"] = list(set(ws.get("file_names", []) + file_names))
    ws["document_texts"].update(document_texts)
    _save_workspaces()


def update_workspace_insights(workspace_id: str, cluster_insights: list):
    """Store cluster insight data inside the workspace."""
    ws = _workspaces.get(workspace_id)
    if not ws:
        return
    ws["cluster_insights"] = cluster_insights
    _save_workspaces()


def update_workspace_entities(workspace_id: str, entities: list):
    ws = _workspaces.get(workspace_id)
    if not ws:
        return
    ws["entities"] = entities
    _save_workspaces()


def update_workspace_relationships(workspace_id: str, relationships: list):
    ws = _workspaces.get(workspace_id)
    if not ws:
        return
    ws["relationships"] = relationships
    _save_workspaces()


def set_drive_connected(workspace_id: str, folder_id: str):
    ws = _workspaces.get(workspace_id)
    if not ws:
        return
    ws["drive_connected"] = True
    ws["drive_folder_id"] = folder_id
    _save_workspaces()