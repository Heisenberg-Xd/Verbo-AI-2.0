"""
services/workspace_manager.py
──────────────────────────────────────────────────────────
Workspace-level isolation for VerboAI.
Now integrated with Supabase (PostgreSQL) repository.
"""

import uuid
import json
import os
from datetime import datetime
from typing import Dict, Optional, List
from database.db import SessionLocal
from database.repository import Repository

# ─────────────────────────────────────────────
# DB HELPERS
# ─────────────────────────────────────────────
def get_repo():
    db = SessionLocal()
    return Repository(db), db

# ─────────────────────────────────────────────
# PUBLIC API (DB-Backed)
# ─────────────────────────────────────────────

def create_workspace(name: str, description: str = "") -> dict:
    """Create and register a new workspace in the database."""
    repo, db = get_repo()
    try:
        ws = repo.create_workspace(name=name, description=description)
        return {
            "workspace_id": ws.workspace_id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at.isoformat(),
            "status": ws.status,
            "file_names": [],
            "document_texts": {},
            "entities": [],
            "relationships": [],
        }
    finally:
        db.close()

def get_workspace(workspace_id: str) -> Optional[dict]:
    """Retrieve a workspace and its related data from the database."""
    repo, db = get_repo()
    try:
        ws = repo.get_workspace(workspace_id)
        if not ws:
            return None
        
        # Hydrate the expected dict structure
        docs = repo.get_workspace_documents(workspace_id)
        intel = repo.get_intelligence(workspace_id)
        
        return {
            "workspace_id": ws.workspace_id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at.isoformat(),
            "status": ws.status,
            "file_names": [d.filename for d in docs],
            "document_texts": {d.filename: d.raw_text for d in docs},
            "entities": intel.entities if intel else [],
            "relationships": intel.relationships if intel else [],
            "insight_data": intel.clusters if intel else [],  # Frontend expects 'insight_data'
            "drive_connected": ws.drive_connected,
            "drive_folder_id": ws.drive_folder_id,
            "last_scan": intel.last_scan if intel else None,
        }
        
        # Add extra metrics from the metadata field
        if intel and intel.metadata:
            workspace_data.update(intel.metadata)
            
        return workspace_data
    finally:
        db.close()

def get_all_workspaces() -> List[dict]:
    """Return a list of all workspace summaries."""
    repo, db = get_repo()
    try:
        workspaces = repo.get_all_workspaces()
        return [{
            "workspace_id": ws.workspace_id,
            "name": ws.name,
            "description": ws.description,
            "created_at": ws.created_at.isoformat(),
            "status": ws.status
        } for ws in workspaces]
    finally:
        db.close()

def list_workspaces() -> List[dict]:
    """Alias for get_all_workspaces used by intelligence_extension."""
    return get_all_workspaces()

def delete_workspace(workspace_id: str) -> bool:
    """Delete a workspace from the database."""
    repo, db = get_repo()
    try:
        return repo.delete_workspace(workspace_id)
    finally:
        db.close()

def update_workspace_data(workspace_id: str, data: dict):
    """
    Update workspace metadata or intelligence results.
    Accepts keys like 'entities', 'relationships', 'cluster_insights'.
    """
    repo, db = get_repo()
    try:
        repo.save_intelligence(
            workspace_id,
            entities=data.get("entities"),
            relationships=data.get("relationships"),
            clusters=data.get("cluster_insights")
        )
    finally:
        db.close()

def update_workspace_entities(workspace_id: str, entities: list):
    """Update extracted entities for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, entities=entities)
    finally:
        db.close()

def update_workspace_relationships(workspace_id: str, relationships: list):
    """Update extracted relationships for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, relationships=relationships)
    finally:
        db.close()

def update_workspace_insights(workspace_id: str, insights: list, **kwargs):
    """Update cluster insights for a workspace."""
    repo, db = get_repo()
    try:
        # Save cluster list and move all other metrics to the metadata field
        repo.save_intelligence(
            workspace_id, 
            clusters=insights,
            analysis_metadata=kwargs
        )
    finally:
        db.close()

def update_workspace_scan(workspace_id: str, last_scan: dict):
    """Update last scan report for a workspace."""
    repo, db = get_repo()
    try:
        repo.save_intelligence(workspace_id, last_scan=last_scan)
    finally:
        db.close()

def update_workspace_documents(workspace_id: str, file_names: List[str], document_texts: Dict[str, str]):
    """Batch update documents in a workspace."""
    repo, db = get_repo()
    try:
        for fname in file_names:
            text = document_texts.get(fname, "")
            # Check if exists (update) or create
            existing = repo.get_document_by_filename(workspace_id, fname)
            if existing:
                existing.raw_text = text
            else:
                repo.add_document(workspace_id, fname, text)
        db.commit()
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
        return count
    finally:
        db.close()

def add_document_to_workspace(workspace_id: str, filename: str, text: str):
    """Persist a new document to the database."""
    repo, db = get_repo()
    try:
        # Check if exists (update) or create
        existing = repo.get_document_by_filename(workspace_id, filename)
        if existing:
            existing.raw_text = text
            db.commit()
        else:
            repo.add_document(workspace_id, filename, text)
    finally:
        db.close()

# Migration support functions (proxies for the migration script)
def _legacy_save_workspaces():
    pass # No longer needed, but kept for import safety

def _legacy_load_workspaces():
    pass # No longer needed