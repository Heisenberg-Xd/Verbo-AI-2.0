"""
metadata_store.py
──────────────────────────────────────────────────────────
Database-backed metadata store for VerboAI ingestion.
Uses Supabase PostgreSQL for persistent file hash registry 
and Google OAuth tokens.
"""

import threading
from typing import Optional, Dict, Any
from datetime import datetime
from database.db import SessionLocal
from database.repository import Repository

_lock = threading.Lock()

def get_repo():
    db = SessionLocal()
    return Repository(db), db

# ─────────────────────────────────────────────
# FILE HASH REGISTRY (deduplication)
# ─────────────────────────────────────────────
def is_hash_registered(file_hash: str) -> bool:
    """Return True if this hash was already ingested."""
    repo, db = get_repo()
    try:
        return repo.is_hash_registered(file_hash)
    finally:
        db.close()

def register_hash(file_hash: str, file_path: str, workspace_id: str):
    """Record that a file with this hash has been ingested."""
    repo, db = get_repo()
    try:
        repo.register_hash(file_hash, workspace_id, file_path)
    finally:
        db.close()

# ─────────────────────────────────────────────
# OAUTH TOKENS
# ─────────────────────────────────────────────
def save_oauth_tokens(access_token: str, refresh_token: Optional[str], expiry: Optional[str] = None):
    """Persist Google OAuth tokens."""
    repo, db = get_repo()
    try:
        expiry_dt = datetime.fromisoformat(expiry) if expiry else None
        repo.save_oauth_tokens(access_token, refresh_token, expiry_dt)
    finally:
        db.close()

def get_oauth_tokens() -> Optional[Dict[str, Any]]:
    """Retrieve stored OAuth tokens."""
    repo, db = get_repo()
    try:
        tk = repo.get_oauth_tokens()
        if not tk or not tk.access_token:
            return None
        return {
            "access_token":  tk.access_token,
            "refresh_token": tk.refresh_token,
            "token_expiry":  tk.token_expiry.isoformat() if tk.token_expiry else None,
        }
    finally:
        db.close()

def clear_oauth_tokens():
    """Remove stored OAuth tokens (disconnect from Drive)."""
    repo, db = get_repo()
    try:
        tk = repo.get_oauth_tokens()
        if tk:
            tk.access_token = None
            tk.refresh_token = None
            tk.token_expiry = None
            db.commit()
    finally:
        db.close()

# ─────────────────────────────────────────────
# FOLDER → WORKSPACE MAPPINGS
# ─────────────────────────────────────────────
def add_folder_mapping(folder_id: str, workspace_id: str, folder_name: str = ""):
    """Map a Google Drive folder_id to a workspace_id."""
    repo, db = get_repo()
    try:
        tk = repo.get_oauth_tokens()
        if not tk:
            tk = repo.save_oauth_tokens("", None, None)
            tk = repo.get_oauth_tokens()
        
        mappings = tk.folder_mappings or {}
        mappings[folder_id] = {
            "workspace_id": workspace_id,
            "folder_name":  folder_name,
        }
        repo.update_folder_mappings(mappings)
    finally:
        db.close()

def remove_folder_mapping(folder_id: str):
    """Remove a folder mapping."""
    repo, db = get_repo()
    try:
        tk = repo.get_oauth_tokens()
        if tk and tk.folder_mappings:
            tk.folder_mappings.pop(folder_id, None)
            repo.update_folder_mappings(tk.folder_mappings)
    finally:
        db.close()

def get_folder_mappings() -> Dict[str, dict]:
    """Return all folder_id → {workspace_id, folder_name} mappings."""
    repo, db = get_repo()
    try:
        tk = repo.get_oauth_tokens()
        if not tk or not tk.folder_mappings:
            return {}
        return tk.folder_mappings
    finally:
        db.close()
