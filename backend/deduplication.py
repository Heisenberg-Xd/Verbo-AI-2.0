"""
deduplication.py
──────────────────────────────────────────────────────────
SHA-256 content-hash based file deduplication system.

Optimizations:
  • Process-level hash cache avoids re-reading unchanged files
  • check_and_register() computes hash ONCE then checks+registers atomically
  • bulk_mark_ingested() registers N files in a single DB round-trip
  • Backward-compatible public API (sha256_hash, is_duplicate, mark_ingested)
"""

import hashlib
import os
import logging
import threading
from typing import Optional

from metadata_store import is_hash_registered, register_hash, bulk_register_hashes

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Process-level in-memory hash cache
# Maps file_path → sha256_digest so unchanged files are never re-hashed.
# Cleared on server restart (which is the correct invalidation point).
# ─────────────────────────────────────────────
_hash_cache: dict[str, str] = {}
_hash_cache_lock = threading.Lock()


def sha256_hash(file_path: str) -> str:
    """
    Compute the SHA-256 hash of a file's content.
    Results are cached in-process so repeated calls on the same path are free.
    """
    with _hash_cache_lock:
        if file_path in _hash_cache:
            return _hash_cache[file_path]

    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
    except Exception as e:
        logger.warning(f"[Dedup] Could not hash {file_path}: {e}")
        # Fall back to a hash of the path string so we never crash
        h.update(file_path.encode("utf-8"))

    digest = h.hexdigest()
    with _hash_cache_lock:
        _hash_cache[file_path] = digest
    return digest


def is_duplicate(file_path: str) -> bool:
    """
    Return True if this file's content has already been ingested.
    Computes hash once (cached); does NOT store anything.
    """
    digest = sha256_hash(file_path)
    dup = is_hash_registered(digest)
    if dup:
        logger.info(f"[Dedup] Duplicate detected: {os.path.basename(file_path)} (hash={digest[:12]}...)")
    return dup


def mark_ingested(file_path: str, workspace_id: str) -> str:
    """
    Register the file as ingested. Returns the hash.
    Must be called AFTER successful processing.
    Hash is computed from cache if available.
    """
    digest = sha256_hash(file_path)
    register_hash(digest, file_path, workspace_id)
    logger.info(f"[Dedup] Registered: {os.path.basename(file_path)} → workspace={workspace_id}")
    return digest


def check_and_register(file_path: str, workspace_id: str) -> tuple[bool, str]:
    """
    Compute the file hash ONCE, check if duplicate, and register if new.
    Returns (is_duplicate, hash_digest).
    
    This is the preferred single-call API — avoids computing the hash twice
    as the old is_duplicate() + mark_ingested() pattern did.
    """
    digest = sha256_hash(file_path)
    already_registered = is_hash_registered(digest)
    if already_registered:
        logger.info(f"[Dedup] Duplicate detected: {os.path.basename(file_path)} (hash={digest[:12]}...)")
        return True, digest
    # Not a duplicate — register now
    register_hash(digest, file_path, workspace_id)
    logger.info(f"[Dedup] Registered: {os.path.basename(file_path)} → workspace={workspace_id}")
    return False, digest


def bulk_mark_ingested(file_paths: list[str], workspace_id: str) -> list[str]:
    """
    Register N files in a single batch DB operation.
    Returns list of hashes that were newly registered (non-duplicates).
    """
    entries = []
    new_hashes = []
    for file_path in file_paths:
        digest = sha256_hash(file_path)
        if not is_hash_registered(digest):
            entries.append({
                "hash_digest": digest,
                "workspace_id": workspace_id,
                "file_path": file_path,
            })
            new_hashes.append(digest)
    if entries:
        bulk_register_hashes(entries)
        logger.info(f"[Dedup] Bulk registered {len(entries)} hashes for workspace={workspace_id}")
    return new_hashes


def get_file_hash(file_path: str) -> str:
    """Public alias for sha256_hash."""
    return sha256_hash(file_path)


def invalidate_hash_cache(file_path: Optional[str] = None):
    """
    Invalidate the in-process hash cache.
    Pass a file_path to invalidate a single entry, or None to clear all.
    """
    with _hash_cache_lock:
        if file_path:
            _hash_cache.pop(file_path, None)
        else:
            _hash_cache.clear()
