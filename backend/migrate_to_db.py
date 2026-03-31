"""
migrate_to_db.py
──────────────────────────────────────────────────────────
Ultra-robust migration.
"""

import json
import os
import logging
from datetime import datetime
from database.db import SessionLocal, Base, engine
from database.models import Workspace, Document, IntelligenceResult, FileHash, OAuthToken
from sqlalchemy.exc import IntegrityError, InternalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Migration")

WORKSPACES_JSON = "workspaces.json"

def migrate():
    if not os.path.exists(WORKSPACES_JSON):
        logger.error(f"{WORKSPACES_JSON} not found.")
        return

    with open(WORKSPACES_JSON, "r", encoding="utf-8") as f:
        ws_data = json.load(f)

    for ws_id, data in ws_data.items():
        db = SessionLocal()
        try:
            # 1. Check/Create Workspace
            existing = db.query(Workspace).filter(Workspace.workspace_id == ws_id).first()
            if not existing:
                logger.info(f"Migrating Workspace: {data.get('name')} ({ws_id})")
                new_ws = Workspace(
                    workspace_id    = ws_id,
                    name            = data.get("name", "Unnamed"),
                    description     = data.get("description", ""),
                    created_at      = datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.utcnow(),
                    status          = data.get("status", "active"),
                )
                db.add(new_ws)
                db.commit()
            
            # 2. Add Documents
            doc_texts = data.get("document_texts", {})
            for fname, text in doc_texts.items():
                existing_doc = db.query(Document).filter(Document.workspace_id == ws_id, Document.filename == fname).first()
                if not existing_doc:
                    new_doc = Document(
                        workspace_id = ws_id,
                        filename     = fname,
                        raw_text     = text
                    )
                    db.add(new_doc)
            db.commit()

            # 3. Add Intelligence
            existing_intel = db.query(IntelligenceResult).filter(IntelligenceResult.workspace_id == ws_id).first()
            if not existing_intel:
                new_intel = IntelligenceResult(
                    workspace_id  = ws_id,
                    entities      = data.get("entities", []),
                    relationships = data.get("relationships", []),
                    clusters      = data.get("cluster_insights", [])
                )
                db.add(new_intel)
                db.commit()
            
            logger.info(f"  Successfully migrated {ws_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"  Failed {ws_id}: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    migrate()
