"""
folder_watcher.py
──────────────────────────────────────────────────────────
File system watcher using watchdog.

Monitors the uploads/ directory for new .txt files and
automatically runs the unified ingestion pipeline on them.

Start via: start_folder_watcher()
Stop via: stop_folder_watcher()

Both are called from main.py lifespan hooks.
"""

import os
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

# Optional watchdog import — degrades gracefully if not installed
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    logger.warning("[FolderWatcher] 'watchdog' not installed — folder watching disabled. Run: pip install watchdog")

from config.settings import UPLOAD_FOLDER

_observer: Optional[object] = None   # watchdog Observer instance


# ─────────────────────────────────────────────
# EVENT HANDLER
# ─────────────────────────────────────────────
if WATCHDOG_AVAILABLE:
    class _UploadHandler(FileSystemEventHandler):
        """Handles new file events in the uploads/ directory."""

        def on_created(self, event: FileCreatedEvent):
            if event.is_directory:
                return
            file_path = event.src_path
            file_name = os.path.basename(file_path)

            # Only process .txt files; ignore temp/hidden files
            if not file_name.endswith(".txt") or file_name.startswith("."):
                return

            logger.info(f"[FolderWatcher] Detected new file: {file_name}")

            # Run ingestion in a separate thread so the watcher isn't blocked
            def _run():
                try:
                    from ingestion_pipeline import ingest_document
                    result = ingest_document(file_path, workspace_id=None)
                    logger.info(f"[FolderWatcher] Result for '{file_name}': {result['status']}")
                except Exception as e:
                    logger.error(f"[FolderWatcher] Error ingesting '{file_name}': {e}")

            threading.Thread(target=_run, daemon=True, name=f"ingest-{file_name}").start()


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────
def start_folder_watcher(watch_path: Optional[str] = None):
    """
    Start watching a directory for new .txt files.
    Defaults to the UPLOAD_FOLDER defined in settings.
    """
    global _observer

    if not WATCHDOG_AVAILABLE:
        logger.warning("[FolderWatcher] watchdog not installed — folder watching skipped.")
        return

    folder = os.path.abspath(watch_path or UPLOAD_FOLDER)
    os.makedirs(folder, exist_ok=True)

    if _observer and _observer.is_alive():
        logger.info("[FolderWatcher] Already running.")
        return

    handler  = _UploadHandler()
    _observer = Observer()
    _observer.schedule(handler, path=folder, recursive=False)
    _observer.start()
    logger.info(f"[FolderWatcher] ✓ Watching: {folder}")


def stop_folder_watcher():
    """Stop the folder watcher gracefully."""
    global _observer
    if _observer and _observer.is_alive():
        _observer.stop()
        _observer.join(timeout=5)
        logger.info("[FolderWatcher] Stopped.")
