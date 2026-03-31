from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .db import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    workspace_id   = Column("workspace_id", String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name           = Column("name", String(255), nullable=False)
    description    = Column("description", Text, nullable=True)
    created_at     = Column("created_at", DateTime, default=datetime.utcnow)
    status         = Column("status", String(50), default="active")
    
    # Store Drive sync state here too
    drive_connected = Column("drive_connected", Boolean, default=False)
    drive_folder_id = Column("drive_folder_id", String(255), nullable=True)

    # Relationships
    documents      = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    intelligence   = relationship("IntelligenceResult", back_populates="workspace", uselist=False, cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    document_id    = Column("document_id", String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id   = Column("workspace_id", String(36), ForeignKey("workspaces.workspace_id"), nullable=False)
    filename       = Column("filename", String(255), nullable=False)
    raw_text       = Column("raw_text", Text, nullable=True)
    file_path      = Column("file_path", Text, nullable=True)
    created_at     = Column("created_at", DateTime, default=datetime.utcnow)
    
    workspace      = relationship("Workspace", back_populates="documents")

class IntelligenceResult(Base):
    __tablename__ = "intelligence_results"

    id             = Column("id", String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id   = Column("workspace_id", String(36), ForeignKey("workspaces.workspace_id"), unique=True, nullable=False)
    
    entities       = Column("entities", JSON, default=list)      # [{type, text, start, end, ...}]
    relationships  = Column("relationships", JSON, default=list)      # [{source, target, type, ...}]
    clusters       = Column("clusters", JSON, default=list)      # [{id, name, documents, ...}]
    last_scan      = Column("last_scan", JSON, nullable=True)     # Latest contradiction report
    analysis_metadata = Column("analysis_metadata", JSON, default=dict)      # Store extra metrics (sentiment, scores, etc.)
    updated_at     = Column("updated_at", DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace      = relationship("Workspace", back_populates="intelligence")

class FileHash(Base):
    __tablename__ = "file_hashes"

    hash_digest    = Column("hash_digest", String(64), primary_key=True)
    workspace_id   = Column("workspace_id", String(36), ForeignKey("workspaces.workspace_id"), nullable=False)
    file_path      = Column("file_path", Text, nullable=True)
    created_at     = Column("created_at", DateTime, default=datetime.utcnow)

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    user_id        = Column("user_id", String(100), primary_key=True, default="default_user")
    access_token   = Column("access_token", Text, nullable=True)
    refresh_token  = Column("refresh_token", Text, nullable=True)
    token_expiry   = Column("token_expiry", DateTime, nullable=True)
    
    # Also store the Drive-to-Workspace map as JSON for simplicity
    folder_mappings = Column("folder_mappings", JSON, default=dict) # {folder_id: {workspace_id, folder_name}}
