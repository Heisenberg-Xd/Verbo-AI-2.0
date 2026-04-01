import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from .models import Workspace, Document, IntelligenceResult, FileHash, OAuthToken
from datetime import datetime

logger = logging.getLogger(__name__)

class Repository:
    def __init__(self, db: Session):
        self.db = db

    # ── Workspace CRUD ──────────────────────────
    def create_workspace(self, name: str, description: str = "") -> Workspace:
        ws = Workspace(name=name, description=description)
        self.db.add(ws)
        self.db.commit()
        self.db.refresh(ws)
        return ws

    def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        return self.db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()

    def get_all_workspaces(self) -> List[Workspace]:
        return self.db.query(Workspace).all()

    def delete_workspace(self, workspace_id: str) -> bool:
        ws = self.get_workspace(workspace_id)
        if ws:
            self.db.delete(ws)
            self.db.commit()
            return True
        return False

    def update_workspace_status(self, workspace_id: str, status: str):
        ws = self.get_workspace(workspace_id)
        if ws:
            ws.status = status
            self.db.commit()

    # ── Document Management ─────────────────────
    def add_document(self, workspace_id: str, filename: str, raw_text: str = "", file_path: str = "") -> Document:
        doc = Document(workspace_id=workspace_id, filename=filename, raw_text=raw_text, file_path=file_path)
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def get_workspace_documents(self, workspace_id: str) -> List[Document]:
        return self.db.query(Document).filter(Document.workspace_id == workspace_id).all()

    def get_document_by_filename(self, workspace_id: str, filename: str) -> Optional[Document]:
        return self.db.query(Document).filter(
            Document.workspace_id == workspace_id, 
            Document.filename == filename
        ).first()

    # ── Intelligence Persistence ────────────────
    def save_intelligence(self, workspace_id: str, 
                         entities: Optional[list] = None, 
                         relationships: Optional[list] = None, 
                         clusters: Optional[list] = None,
                         last_scan: Optional[dict] = None,
                         analysis_metadata: Optional[dict] = None) -> IntelligenceResult:
        res = self.db.query(IntelligenceResult).filter(IntelligenceResult.workspace_id == workspace_id).first()
        if not res:
            res = IntelligenceResult(workspace_id=workspace_id)
            self.db.add(res)
        
        if entities is not None:
            res.entities = entities
        if relationships is not None:
            res.relationships = relationships
        if clusters is not None:
            res.clusters = clusters
        if last_scan is not None:
            res.last_scan = last_scan
        if analysis_metadata is not None:
            # Merge or replace? We'll replace for simplicity in this context
            res.analysis_metadata = analysis_metadata
        
        res.updated_at = datetime.utcnow()
        self.db.commit()
        return res

    def get_intelligence(self, workspace_id: str) -> Optional[IntelligenceResult]:
        return self.db.query(IntelligenceResult).filter(IntelligenceResult.workspace_id == workspace_id).first()

    # ── Deduplication / Hashing ─────────────────
    def register_hash(self, hash_digest: str, workspace_id: str, file_path: str = ""):
        """Register a single file hash. Silently ignores duplicates."""
        try:
            fh = FileHash(hash_digest=hash_digest, workspace_id=workspace_id, file_path=file_path)
            self.db.add(fh)
            self.db.commit()
        except Exception:
            self.db.rollback()  # Already registered (primary key conflict)

    def is_hash_registered(self, hash_digest: str) -> bool:
        """Use .first() instead of .count() to short-circuit on first match."""
        return self.db.query(FileHash.hash_digest).filter(
            FileHash.hash_digest == hash_digest
        ).first() is not None

    def bulk_register_hashes(self, entries: List[Dict[str, str]]):
        """
        Register multiple hashes in a single round-trip.
        Each entry: {"hash_digest": str, "workspace_id": str, "file_path": str}
        Skips already-registered hashes via ON CONFLICT DO NOTHING.
        """
        if not entries:
            return
        dialect = "unknown"
        try:
            dialect = self.db.bind.dialect.name
            if "postgresql" in dialect:
                # PostgreSQL-specific ON CONFLICT DO NOTHING
                stmt = pg_insert(FileHash).values(entries).on_conflict_do_nothing(index_elements=['hash_digest'])
            elif "sqlite" in dialect:
                # SQLite-specific INSERT OR IGNORE
                stmt = sqlite_insert(FileHash).prefix_with("OR IGNORE").values(entries)
            else:
                # Generic fallback for other dialects
                logger.info(f"[Repo] Dialect '{dialect}' not optimized; falling back to one-by-one.")
                for entry in entries:
                    try:
                        fh = FileHash(**entry)
                        self.db.add(fh)
                        self.db.commit()
                    except Exception:
                        self.db.rollback()
                return
            
            self.db.execute(stmt)
            self.db.commit()
        except Exception as e:
            logger.warning(f"[Repo] Bulk register failed (dialect={dialect}): {e}")
            self.db.rollback()
            # Fallback: insert one-by-one ignoring errors
            for entry in entries:
                try:
                    fh = FileHash(**entry)
                    self.db.add(fh)
                    self.db.commit()
                except Exception:
                    self.db.rollback()

    def get_all_hashes(self) -> Dict[str, Dict]:
        """Return all registered file hashes as {digest: {path, workspace_id, created_at}}."""
        rows = self.db.query(FileHash).all()
        return {
            row.hash_digest: {
                "path": row.file_path or "",
                "workspace_id": row.workspace_id,
                "ingested_at": row.created_at.isoformat() if row.created_at else "",
            }
            for row in rows
        }

    def bulk_upsert_documents(self, workspace_id: str, docs: List[Dict[str, str]]):
        """
        Upsert documents for a workspace in a single batch.
        Each doc: {"filename": str, "raw_text": str, "file_path": str}
        """
        if not docs:
            return
        existing = {
            d.filename: d
            for d in self.db.query(Document).filter(Document.workspace_id == workspace_id).all()
        }
        for doc in docs:
            fname = doc["filename"]
            if fname in existing:
                existing[fname].raw_text = doc.get("raw_text", "")
            else:
                self.db.add(Document(
                    workspace_id=workspace_id,
                    filename=fname,
                    raw_text=doc.get("raw_text", ""),
                    file_path=doc.get("file_path", ""),
                ))
        self.db.commit()

    # ── OAuth ───────────────────────────────────
    def save_oauth_tokens(self, access: str, refresh: Optional[str], expiry: Optional[datetime], user_id: str = "default_user"):
        tk = self.db.query(OAuthToken).filter(OAuthToken.user_id == user_id).first()
        if not tk:
            tk = OAuthToken(user_id=user_id)
            self.db.add(tk)
        
        tk.access_token = access
        if refresh:
            tk.refresh_token = refresh
        if expiry:
            tk.token_expiry = expiry
        self.db.commit()

    def get_oauth_tokens(self, user_id: str = "default_user") -> Optional[OAuthToken]:
        return self.db.query(OAuthToken).filter(OAuthToken.user_id == user_id).first()

    def update_folder_mappings(self, mappings: dict, user_id: str = "default_user"):
        tk = self.db.query(OAuthToken).filter(OAuthToken.user_id == user_id).first()
        if tk:
            tk.folder_mappings = mappings
            self.db.commit()
