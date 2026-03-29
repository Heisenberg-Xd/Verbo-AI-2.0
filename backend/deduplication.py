"""
deduplication.py
──────────────────────────────────────────────────────────
SHA-256 content-hash based file deduplication system.

Usage:
    from deduplication import file_hash, is_duplicate, mark_ingested

All state is persisted in metadata.json via metadata_store.
"""

import hashlib
import os
import logging

from metadata_store import is_hash_registered, register_hash

logger = logging.getLogger(__name__)


def sha256_hash(file_path: str) -> str:
    """
    Compute the SHA-256 hash of a file's content.
    Used as a stable, content-addressable fingerprint.
    """
    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
    except Exception as e:
        logger.warning(f"[Dedup] Could not hash {file_path}: {e}")
        # Fall back to a hash of the path string so we never crash
        h.update(file_path.encode("utf-8"))
    return h.hexdigest()


def is_duplicate(file_path: str) -> bool:
    """
    Return True if this file's content has already been ingested.
    Computes hash on the fly; does NOT store anything.
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
    """
    digest = sha256_hash(file_path)
    register_hash(digest, file_path, workspace_id)
    logger.info(f"[Dedup] Registered: {os.path.basename(file_path)} → workspace={workspace_id}")
    return digest


def get_file_hash(file_path: str) -> str:
    """Public alias for sha256_hash."""
    return sha256_hash(file_path)
