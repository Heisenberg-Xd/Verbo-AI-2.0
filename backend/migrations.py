"""
migrations.py
─────────────────────────────────────────────────────────
Safe, idempotent schema migrations for VerboAI.
Called at every server startup — no-ops if migrations already applied.

Supports both:
  • PostgreSQL (Supabase): ADD COLUMN IF NOT EXISTS
  • SQLite (local verbo.db):  PRAGMA table_info() check
"""

import logging
from sqlalchemy import text
from database.db import engine

logger = logging.getLogger(__name__)


def _is_postgres() -> bool:
    return "postgresql" in str(engine.url).lower() or "postgres" in str(engine.url).lower()


def _column_exists_sqlite(conn, table: str, column: str) -> bool:
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def _safe_migrate():
    """
    Apply all pending schema migrations safely.
    Each migration is guarded so it never crashes if already applied.
    """
    with engine.connect() as conn:
        _migrate_intelligence_results(conn)
        _migrate_file_hashes_index(conn)
        conn.commit()
    logger.info("[Migration] Schema up to date.")


def _migrate_intelligence_results(conn):
    """Add content_fingerprint column to intelligence_results if missing."""
    try:
        if _is_postgres():
            # PostgreSQL: ADD COLUMN IF NOT EXISTS is atomic and safe
            conn.execute(text(
                "ALTER TABLE intelligence_results "
                "ADD COLUMN IF NOT EXISTS content_fingerprint VARCHAR(64)"
            ))
            logger.info("[Migration] intelligence_results.content_fingerprint: ensured (PostgreSQL)")
        else:
            # SQLite: check via PRAGMA first
            if not _column_exists_sqlite(conn, "intelligence_results", "content_fingerprint"):
                conn.execute(text(
                    "ALTER TABLE intelligence_results ADD COLUMN content_fingerprint TEXT"
                ))
                logger.info("[Migration] intelligence_results.content_fingerprint: added (SQLite)")
            else:
                logger.debug("[Migration] intelligence_results.content_fingerprint: already exists (SQLite)")
    except Exception as e:
        logger.warning(f"[Migration] content_fingerprint migration skipped: {e}")


def _migrate_file_hashes_index(conn):
    """Create composite index on file_hashes(workspace_id, hash_digest) if missing."""
    try:
        if _is_postgres():
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_file_hashes_ws_hash "
                "ON file_hashes (workspace_id, hash_digest)"
            ))
            logger.info("[Migration] ix_file_hashes_ws_hash: ensured (PostgreSQL)")
        else:
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_file_hashes_ws_hash "
                "ON file_hashes (workspace_id, hash_digest)"
            ))
            logger.info("[Migration] ix_file_hashes_ws_hash: ensured (SQLite)")
    except Exception as e:
        logger.warning(f"[Migration] file_hashes index migration skipped: {e}")
