"""
services/workspace_manager.py
──────────────────────────────────────────────────────────
Workspace-level isolation for VerboAI.
Integrated with SQLAlchemy (SQLite / PostgreSQL) repository.

Optimizations:
  • Process-level _workspace_cache with 60s TTL — read operations skip DB
  • get_workspace uses a single DB session (no per-call open/close churn)
  • update_workspace_documents uses bulk_upsert_documents (eliminates N+1)
  • workspace_fingerprint() computes stable SHA-256 over sorted file hashes
  • _invalidate_ws_cache() called on every write to keep cache consistent
"""

import uuid
import hashlib
import time
import threading
from datetime import datetime
from typing import Dict, Optional, List

from database.db import SessionLocal
from database.repository import Repository

# ─────────────────────────────────────────────
# Process-level workspace cache (TTL = 60s)
# ─────────────────────────────────────────────
_WS_CACHE_TTL = 60  # seconds
_ws_cache: Dict[str, dict] = {}       # workspace_id → {data, expires_at}
_ws_cache_lock = threading.Lock()


def _cache_get(workspace_id: str) -> Optional[dict]:
    with _ws_cache_lock:
        entry = _ws_cache.get(workspace_id)
        if entry and time.time() < entry["expires_at"]:
            return entry["data"]
        _ws_cache.pop(workspace_id, None)
        return None


def _cache_set(workspace_id: str, data: dict):
    with _ws_cache_lock:
        _ws_cache[workspace_id] = {
            "data": data,
            "expires_at": time.time() + _WS_CACHE_TTL,
        }


def _invalidate_ws_cache(workspace_id: str):
    with _ws_cache_lock:
        _ws_cache.pop(workspace_id, None)


# ─────────────────────────────────────────────
# DB HELPERS
# ─────────────────────────────────────────────
def get_repo():
    db = SessionLocal()
    return Repository(db), db


def _ws_to_dict(ws, docs, intel) -> dict:
    """Convert ORM objects into the standard workspace dict."""
    data = {
        "workspace_id":   ws.workspace_id,
        "name":           ws.name,
        "description":    ws.description,
        "created_at":     ws.created_at.isoformat(),
        "status":         ws.status,
        "file_names":     [d.filename for d in docs],
        "document_texts": {d.filename: d.raw_text for d in docs},
        "entities":       intel.entities       if intel else [],
        "relationships":  intel.relationships  if intel else [],
        "insight_data":   intel.clusters       if intel else [],
        "drive_connected": ws.drive_connected,
        "drive_folder_id": ws.drive_folder_id,
        "last_scan":      intel.last_scan      if intel else None,
        "content_fingerprint": intel.content_fingerprint if intel else None,
    }
    if intel and intel.analysis_metadata:
        data.update(intel.analysis_metadata)
    return data


# ─────────────────────────────────────────────
# FINGERPRINTING
# ─────────────────────────────────────────────
def workspace_fingerprint(workspace_id: str) -> Optional[str]:
    """
    Compute a stable SHA-256 fingerprint of the workspace's document set.
    Based on sorted file hashes from the dedup registry.
    Returns None if workspace or hashes not found.
    """
    repo, db = get_repo()
    try:
        from database.models import FileHash
        hashes = (
            db.query(FileHash.hash_digest)
            .filter(FileHash.workspace_id == workspace_id)
            .order_by(FileHash.hash_digest)
            .all()
        )
        if not hashes:
            return None
        combined = "|".join(h[0] for h in hashes)
        return hashlib.sha256(combined.encode()).hexdigest()
    finally:
        db.close()


# ─────────────────────────────────────────────
# PUBLIC API (DB-Backed)
# ─────────────────────────────────────────────

def create_workspace(name: str, description: str = "") -> dict:
    """Create and register a new workspace in the database."""
    repo, db = get_repo()
    try:
        ws = repo.create_workspace(name=name, description=description)
        data = {
            "workspace_id":   ws.workspace_id,
            "name":           ws.name,
            "description":    ws.description,
            "created_at":     ws.created_at.isoformat(),
            "status":         ws.status,
            "file_names":     [],
            "document_texts": {},
            "entities":       [],
            "relationships":  [],
        }
        _cache_set(ws.workspace_id, data)
        return data
    finally:
        db.close()


def get_workspace(workspace_id: str) -> Optional[dict]:
    """
    Retrieve a workspace and its related data.
    Serves from in-memory cache if fresh; otherwise fetches from DB
    in a single session (workspace + documents + intelligence).
    """
    cached = _cache_get(workspace_id)
    if cached is not None:
        return cached

    repo, db = get_repo()
    try:
        ws = repo.get_workspace(workspace_id)
        if not ws:
            return None
        docs  = repo.get_workspace_documents(workspace_id)
        intel = repo.get_intelligence(workspace_id)
        data  = _ws_to_dict(ws, docs, intel)
        _cache_set(workspace_id, data)
        return data
    finally:
        db.close()


def get_all_workspaces() -> List[dict]:
    """Return a list of all workspace summaries."""
    repo, db = get_repo()
    try:
        workspaces = repo.get_all_workspaces()
        return [
            {
                "workspace_id": ws.workspace_id,
                "name":         ws.name,
                "description":  ws.description,
                "created_at":   ws.created_at.isoformat(),
                "status":       ws.status,
            }
            for ws in workspaces
        ]
    finally:
        db.close()


def list_workspaces() -> List[dict]:
    """Alias for get_all_workspaces used by intelligence_extension."""
    return get_all_workspaces()


def delete_workspace(workspace_id: str) -> bool:
    """Delete a workspace from the database."""
    repo, db = get_repo()
    try:
        result = repo.delete_workspace(workspace_id)
        if result:
            _invalidate_ws_cache(workspace_id)
        return result
    finally:
        db.close()


def update_workspace_data(workspace_id: str, data: dict):
    """Update workspace metadata or intelligence results."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(
            workspace_id,
            entities=data.get("entities"),
            relationships=data.get("relationships"),
            clusters=data.get("cluster_insights"),
        )
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_entities(workspace_id: str, entities: list):
    """Update extracted entities for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, entities=entities)
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_relationships(workspace_id: str, relationships: list):
    """Update extracted relationships for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, relationships=relationships)
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_insights(workspace_id: str, insights: list, **kwargs):
    """Update cluster insights for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(
            workspace_id,
            clusters=insights,
            analysis_metadata=kwargs,
        )
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_scan(workspace_id: str, last_scan: dict):
    """Update last scan report for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, last_scan=last_scan)
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_documents(workspace_id: str, file_names: List[str], document_texts: Dict[str, str]):
    """
    Batch-upsert documents in a workspace.
    Replaces the old N+1 loop (1 SELECT + 1 INSERT per doc) with a single
    bulk operation that fetches all existing docs in one query then commits once.
    """
    repo, db = get_repo()
    try:
        docs = [
            {
                "filename":  fname,
                "raw_text":  document_texts.get(fname, ""),
                "file_path": "",
            }
            for fname in file_names
        ]
        repo.bulk_upsert_documents(workspace_id, docs)
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def set_drive_connected(workspace_id: str, folder_id: str):
    """Mark a workspace as connected to a Drive folder."""
    repo, db = get_repo()
    try:
        ws = repo.get_workspace(workspace_id)
        if ws:
            ws.drive_connected = True
            ws.drive_folder_id = folder_id
            db.commit()
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def clear_workspaces() -> int:
    """Wipe all workspaces from the DB. Use with caution."""
    repo, db = get_repo()
    try:
        workspaces = repo.get_all_workspaces()
        count = len(workspaces)
        for ws in workspaces:
            db.delete(ws)
        db.commit()
        with _ws_cache_lock:
            _ws_cache.clear()
        return count
    finally:
        db.close()


def add_document_to_workspace(workspace_id: str, filename: str, text: str):
    """Persist a single document to the database."""
    repo, db = get_repo()
    try:
        existing = repo.get_document_by_filename(workspace_id, filename)
        if existing:
            existing.raw_text = text
            db.commit()
        else:
            repo.add_document(workspace_id, filename, text)
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


def update_workspace_fingerprint(workspace_id: str, fingerprint: str):
    """Persist the content fingerprint to IntelligenceResult for cross-restart cache."""
    repo, db = get_repo()
    try:
        intel = repo.get_intelligence(workspace_id)
        if not intel:
            from database.models import IntelligenceResult
            intel = IntelligenceResult(workspace_id=workspace_id)
            db.add(intel)
        intel.content_fingerprint = fingerprint
        intel.updated_at = datetime.utcnow()
        db.commit()
        _invalidate_ws_cache(workspace_id)
    finally:
        db.close()


# Migration support functions (kept for import safety)
def _legacy_save_workspaces():
    pass

def _legacy_load_workspaces():
    pass