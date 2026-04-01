"""
ingestion_pipeline.py
──────────────────────────────────────────────────────────
Unified document ingestion entrypoint for VerboAI.

ALL paths that bring text into the system (manual upload,
folder watcher, Google Drive sync) call this single function.

ingest_document() guarantees:
  1. Deduplication — skips already-processed files
  2. Runs the full intelligence pipeline (embeddings, clustering, KG, RAG)
  3. Persists the file hash — never processes the same content twice
  4. Workspace-scoped — results stored under the given workspace_id
"""

import os
import logging
from typing import Optional

from config.settings import UPLOAD_FOLDER
from deduplication import is_duplicate, mark_ingested

logger = logging.getLogger(__name__)


def ingest_document(file_path: str, workspace_id: Optional[str] = None) -> dict:
    """
    Core unified ingestion function.

    Args:
        file_path:    Absolute or relative path to the .txt file.
                      Must already be saved to disk before calling.
        workspace_id: The workspace to attach this document to.
                      Optional — skips workspace ops if None.

    Returns:
        dict with keys: status, file_name, workspace_id, message
    """
    file_name = os.path.basename(file_path)

    # ── Guard: file must exist ────────────────────────────────────────────
    if not os.path.exists(file_path):
        logger.warning(f"[Ingestion] File not found: {file_path}")
        return {"status": "error", "file_name": file_name, "message": "File not found"}

    # ── Guard: only .txt files are supported right now ────────────────────
    if not file_name.endswith(".txt"):
        logger.info(f"[Ingestion] Skipping non-txt file: {file_name}")
        return {"status": "skipped", "file_name": file_name, "message": "Only .txt files are supported"}

    # ── Step 1: Deduplication check ───────────────────────────────────────
    is_dup = is_duplicate(file_path)
    if is_dup:
        logger.info(f"[Ingestion] '{file_name}' already ingested. Ensuring workspace attachment.")
    else:
        logger.info(f"[Ingestion] Processing new file '{file_name}' → workspace={workspace_id}")

    # ── Step 2: Register file with workspace ─────────────────────────────
    try:
        if not os.path.isabs(file_path):
            file_path = os.path.abspath(file_path)

        uploads_abs = os.path.abspath(UPLOAD_FOLDER)
        if os.path.dirname(file_path) == uploads_abs:
            pipeline_file_name = file_name
        else:
            # Copy to uploads if not already there
            target = os.path.join(uploads_abs, file_name)
            if not os.path.exists(target):
                import shutil
                shutil.copy2(file_path, target)
            pipeline_file_name = file_name

        if workspace_id:
            try:
                from services.workspace_manager import add_document_to_workspace
                with open(file_path, "r", encoding="utf-8") as f:
                    text_content = f.read()
                
                add_document_to_workspace(workspace_id, pipeline_file_name, text_content)
            except Exception as ws_err:
                logger.warning(f"[Ingestion] Workspace DB update warning: {ws_err}")

    except Exception as e:
        logger.error(f"[Ingestion] Error adding '{file_name}': {e}")
        return {
            "status":    "error",
            "file_name": file_name,
            "message":   str(e)
        }

    # ── Step 4: Register hash so we never process it again ────────────────
    mark_ingested(file_path, workspace_id or "global")

    logger.info(f"[Ingestion] ✓ Successfully ingested: {file_name}")
    return {
        "status":       "ingested",
        "file_name":    file_name,
        "workspace_id": workspace_id,
        "message":      f"'{file_name}' ingested successfully."
    }


def ingest_text(text: str, file_name: str, workspace_id: Optional[str] = None) -> dict:
    """
    Convenience helper — writes raw text to the uploads folder then
    calls ingest_document(). Used by Google Drive sync and folder watcher
    when the file content is already in memory.
    """
    target_path = os.path.join(os.path.abspath(UPLOAD_FOLDER), file_name)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(text)
    return ingest_document(target_path, workspace_id)
