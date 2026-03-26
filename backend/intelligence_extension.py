"""
intelligence_extension.py
──────────────────────────────────────────────────────────
VerboAI Intelligence Platform Extension.

Adds:
  • Workspace management         POST/GET /workspace/...
  • Google Drive ingestion       POST /workspace/{id}/connect-drive
  • Entity extraction            GET  /workspace/{id}/entities
  • Relationship extraction      GET  /workspace/{id}/relationships
  • Knowledge graph              GET  /workspace/{id}/knowledge-graph
  • Entity investigation         GET  /workspace/{id}/entity/{name}/connections
  • AI Chat entity enrichment    (extends rag_store retrieval — no endpoint change)

IMPORTANT: Does NOT modify or import from main.py's route handlers.
           Hooks into the pipeline via register_intelligence(app).
           Call register_intelligence(app) at the bottom of main.py.
"""

import os
import asyncio
import logging
from typing import Optional, List

from cache_manager import get_cache, set_cache, make_cache_key, clear_cache

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, BackgroundTasks, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Our new service modules ──────────────────────────────────────────────────
from services.workspace_manager   import (
    create_workspace, get_workspace, list_workspaces,
    update_workspace_documents, update_workspace_insights,
    update_workspace_entities, update_workspace_relationships,
)
from services.entity_extractor    import extract_entities_from_documents, get_entity_summary
from services.relationship_extractor import extract_relationships
from services.knowledge_graph     import build_knowledge_graph, get_entity_connections
from services.drive_ingestion     import ingest_from_drive, get_drive_status
from api.scanner_routes import router as scanner_router

# ── Constants (mirrors main.py so we write to the same folder) ───────────────
from config.settings import UPLOAD_FOLDER


# ─────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class CreateWorkspaceRequest(BaseModel):
    name: str
    description: str = ""


class ConnectDriveRequest(BaseModel):
    folder_id: str
    process_immediately: bool = True  # run full pipeline after download


class EnrichChatRequest(BaseModel):
    """Optional body for entity-enriched chat (extends /rag/chat internally)."""
    workspace_id: str
    query: str
    include_entities: bool = True
    include_relationships: bool = True


# ─────────────────────────────────────────────
# BACKGROUND PIPELINE HELPER
# ─────────────────────────────────────────────
async def _run_intelligence_pipeline(workspace_id: str, document_texts: dict):
    """
    Run entity + relationship extraction + knowledge graph build
    in the background after documents are ingested.
    """
    try:
        # 1. Extract entities (with caching)
        entity_cache_key = make_cache_key("entities", workspace_id, sorted(document_texts.items()))
        entities = get_cache("entities", entity_cache_key)
        if entities is None:
            entities = extract_entities_from_documents(document_texts)
            set_cache("entities", entity_cache_key, entities)
        update_workspace_entities(workspace_id, entities)

        # 2. Extract relationships (with caching)
        rel_cache_key = make_cache_key("relationships", workspace_id, sorted(document_texts.items()))
        relationships = get_cache("relationships", rel_cache_key)
        if relationships is None:
            relationships = extract_relationships(document_texts, entities)
            set_cache("relationships", rel_cache_key, relationships)
        update_workspace_relationships(workspace_id, relationships)

    except Exception as e:
        print(f"[IntelligencePipeline] Error for workspace {workspace_id}: {e}")


def _run_pipeline_sync(workspace_id: str, document_texts: dict):
    """Synchronous wrapper used by Drive ingestion endpoint."""
    try:
        # Cached entity extraction
        entity_cache_key = make_cache_key("entities", workspace_id, sorted(document_texts.items()))
        entities = get_cache("entities", entity_cache_key)
        if entities is None:
            entities = extract_entities_from_documents(document_texts)
            set_cache("entities", entity_cache_key, entities)
        update_workspace_entities(workspace_id, entities)

        # Cached relationship extraction
        rel_cache_key = make_cache_key("relationships", workspace_id, sorted(document_texts.items()))
        relationships = get_cache("relationships", rel_cache_key)
        if relationships is None:
            relationships = extract_relationships(document_texts, entities)
            set_cache("relationships", rel_cache_key, relationships)
        update_workspace_relationships(workspace_id, relationships)
        return entities, relationships
    except Exception as e:
        print(f"[IntelligencePipeline] Sync error: {e}")
        return [], []


# ─────────────────────────────────────────────
# WORKSPACE ROUTER
# ─────────────────────────────────────────────
router = APIRouter()

@router.post("/workspace/create")
async def workspace_create(req: CreateWorkspaceRequest):
    """Create a new workspace (isolated document intelligence environment)."""
    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Workspace name is required.")
    ws = create_workspace(name=req.name.strip(), description=req.description)
    return JSONResponse({
        "status":       "created",
        "workspace":    ws,
        "message":      f"Workspace '{ws['name']}' created with ID {ws['workspace_id']}",
    })

@router.get("/workspace/list")
async def workspace_list():
    """List all workspaces."""
    workspaces = list_workspaces()
    return JSONResponse({
        "workspaces": workspaces,
        "total":      len(workspaces),
    })

@router.delete("/workspace/{workspace_id}")
async def workspace_delete(workspace_id: str):
    """Delete a workspace and its state entirely."""
    from services.workspace_manager import delete_workspace
    success = delete_workspace(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return JSONResponse({"status": "deleted", "message": f"Workspace {workspace_id} deleted."})

@router.get("/workspace/{workspace_id}")
async def workspace_get(workspace_id: str):
    """Get workspace details including entity and relationship counts."""
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    entities      = ws.get("entities", [])
    relationships = ws.get("relationships", [])
    entity_summary = get_entity_summary(entities)

    return JSONResponse({
        "workspace_id":       ws["workspace_id"],
        "name":               ws["name"],
        "description":        ws.get("description", ""),
        "created_at":         ws.get("created_at"),
        "status":             ws.get("status", "active"),
        "document_count":     len(ws.get("file_names", [])),
        "file_names":         ws.get("file_names", []),
        "entity_count":       len(entities),
        "relationship_count": len(relationships),
        "entity_type_summary": entity_summary,
        "cluster_count":      len(ws.get("cluster_insights", [])),
        "drive_connected":    ws.get("drive_connected", False),
        "drive_folder_id":    ws.get("drive_folder_id"),
    })

@router.post("/workspace/{workspace_id}/connect-drive")
async def connect_drive(workspace_id: str, req: ConnectDriveRequest, background_tasks: BackgroundTasks):
    """
    Connect workspace to a Google Drive folder.
    Downloads all supported files → runs existing VerboAI pipeline.
    """
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    drive_status = get_drive_status()

    # Download files from Drive (simulation mode works without credentials)
    try:
        saved_names, document_texts = ingest_from_drive(
            folder_id=req.folder_id,
            upload_folder=UPLOAD_FOLDER,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Drive ingestion failed: {str(e)}")

    if not saved_names:
        return JSONResponse({
            "status":  "no_files",
            "message": "No supported files found in the Drive folder.",
            "drive_status": drive_status,
        })

    # Register files in workspace
    update_workspace_documents(workspace_id, saved_names, document_texts)

    # Mark drive as connected
    from services.workspace_manager import set_drive_connected
    set_drive_connected(workspace_id, req.folder_id)

    # Run intelligence pipeline in background
    if req.process_immediately:
        background_tasks.add_task(_run_pipeline_sync, workspace_id, document_texts)

    return JSONResponse({
        "status":         "ingested",
        "workspace_id":   workspace_id,
        "files_ingested": saved_names,
        "file_count":     len(saved_names),
        "drive_status":   drive_status,
        "pipeline_note":  "Entity/relationship extraction running in background." if req.process_immediately else "Set process_immediately=true to auto-analyse.",
        "next_step":      f"POST /process with file_paths={saved_names} to run full clustering pipeline.",
    })

@router.get("/workspace/{workspace_id}/drive-status")
async def drive_status_check(workspace_id: str):
    """Check Drive authentication status."""
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return JSONResponse({
        "workspace_id":   workspace_id,
        "drive_connected": ws.get("drive_connected", False),
        "drive_folder_id": ws.get("drive_folder_id"),
        **get_drive_status(),
    })

@router.get("/workspace/{workspace_id}/entities")
async def get_entities(
    workspace_id: str,
    entity_type: Optional[str] = None,
    min_confidence: float = 0.0,
    limit: int = 200,
):
    """
    Return all extracted entities for a workspace.
    Filters: entity_type (person/organization/location/technology/product)
             min_confidence (0.0–1.0)
    """
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    entities = ws.get("entities", [])

    # If no entities yet, try to run extraction now (with caching)
    if not entities and ws.get("document_texts"):
        entity_cache_key = make_cache_key("entities", workspace_id, sorted(ws["document_texts"].items()))
        entities = get_cache("entities", entity_cache_key)
        if entities is None:
            entities = extract_entities_from_documents(ws["document_texts"])
            set_cache("entities", entity_cache_key, entities)
        update_workspace_entities(workspace_id, entities)

    # Filter
    if entity_type:
        entities = [e for e in entities if e.get("type") == entity_type.lower()]
    entities = [e for e in entities if e.get("confidence", 0) >= min_confidence]
    entities = entities[:limit]

    return JSONResponse({
        "workspace_id":  workspace_id,
        "entities":      entities,
        "total":         len(entities),
        "type_summary":  get_entity_summary(entities),
    })

@router.post("/workspace/{workspace_id}/entities/refresh")
async def refresh_entities(workspace_id: str):
    """Re-run entity extraction on current workspace documents."""
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    doc_texts = ws.get("document_texts", {})
    if not doc_texts:
        raise HTTPException(
            status_code=400,
            detail="No documents in workspace. Ingest files first."
        )

    # Clear entity/relationship/KG caches for this workspace on refresh
    clear_cache("entities")
    clear_cache("relationships")
    clear_cache("knowledge_graph")

    entities = extract_entities_from_documents(doc_texts)
    entity_cache_key = make_cache_key("entities", workspace_id, sorted(doc_texts.items()))
    set_cache("entities", entity_cache_key, entities)
    update_workspace_entities(workspace_id, entities)

    return JSONResponse({
        "status":        "refreshed",
        "entity_count":  len(entities),
        "type_summary":  get_entity_summary(entities),
    })

@router.get("/workspace/{workspace_id}/relationships")
async def get_relationships(
    workspace_id: str,
    relationship_type: Optional[str] = None,
    min_confidence: float = 0.0,
    limit: int = 200,
):
    """
    Return all extracted relationships for a workspace.
    Each relationship: { subject, relationship, object, source_files, confidence }
    """
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    relationships = ws.get("relationships", [])

    # Auto-extract if empty (with caching)
    if not relationships and ws.get("document_texts") and ws.get("entities"):
        rel_cache_key = make_cache_key("relationships", workspace_id, sorted(ws["document_texts"].items()))
        relationships = get_cache("relationships", rel_cache_key)
        if relationships is None:
            relationships = extract_relationships(ws["document_texts"], ws["entities"])
            set_cache("relationships", rel_cache_key, relationships)
        update_workspace_relationships(workspace_id, relationships)

    # Filter
    if relationship_type:
        relationships = [r for r in relationships if r.get("relationship") == relationship_type]
    relationships = [r for r in relationships if r.get("confidence", 0) >= min_confidence]
    relationships = relationships[:limit]

    # Summarise relationship types
    type_summary: dict = {}
    for r in relationships:
        t = r.get("relationship", "unknown")
        type_summary[t] = type_summary.get(t, 0) + 1

    return JSONResponse({
        "workspace_id":     workspace_id,
        "relationships":    relationships,
        "total":            len(relationships),
        "type_summary":     type_summary,
    })

@router.get("/workspace/{workspace_id}/knowledge-graph")
async def get_knowledge_graph(
    workspace_id: str,
    min_confidence: float = 0.4,
    max_nodes: int = 150,
):
    """
    Build and return the full knowledge graph for a workspace.
    Returns D3-compatible { nodes, edges, stats } JSON.
    """
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    entities      = ws.get("entities", [])
    relationships = ws.get("relationships", [])

    if not entities:
        # Try extracting first (with caching)
        doc_texts = ws.get("document_texts", {})
        if not doc_texts:
            return JSONResponse({
                "workspace_id": workspace_id,
                "nodes":  [],
                "edges":  [],
                "stats":  {"total_nodes": 0, "total_edges": 0},
                "message": "No documents found. Ingest documents first.",
            })
        entity_cache_key = make_cache_key("entities", workspace_id, sorted(doc_texts.items()))
        entities = get_cache("entities", entity_cache_key)
        if entities is None:
            entities = extract_entities_from_documents(doc_texts)
            set_cache("entities", entity_cache_key, entities)
        update_workspace_entities(workspace_id, entities)

        rel_cache_key = make_cache_key("relationships", workspace_id, sorted(doc_texts.items()))
        relationships = get_cache("relationships", rel_cache_key)
        if relationships is None:
            relationships = extract_relationships(doc_texts, entities)
            set_cache("relationships", rel_cache_key, relationships)
        update_workspace_relationships(workspace_id, relationships)

    # ── Cache check for the full knowledge graph build ────────────────────
    kg_cache_key = make_cache_key("kg", workspace_id, min_confidence, max_nodes, len(entities), len(relationships))
    cached_graph = get_cache("knowledge_graph", kg_cache_key)
    if cached_graph is not None:
        return JSONResponse({
            "workspace_id": workspace_id,
            **cached_graph,
        })

    # Filter by confidence
    filtered_entities = [e for e in entities if e.get("confidence", 0) >= min_confidence]
    filtered_rels     = [r for r in relationships if r.get("confidence", 0) >= min_confidence]

    # Cap nodes for performance
    filtered_entities = filtered_entities[:max_nodes]

    graph = build_knowledge_graph(filtered_entities, filtered_rels)

    # Cache the built graph
    set_cache("knowledge_graph", kg_cache_key, graph)

    return JSONResponse({
        "workspace_id": workspace_id,
        **graph,
    })

@router.get("/workspace/{workspace_id}/entity/{entity_name}/connections")
async def entity_connections(workspace_id: str, entity_name: str):
    """
    Investigation API: explore everything connected to a specific entity.
    Returns related entities, relationship types, and related documents.
    """
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found.")

    entities      = ws.get("entities", [])
    relationships = ws.get("relationships", [])

    if not entities:
        return JSONResponse({
            "entity_name": entity_name,
            "message": "No entities extracted yet. Run /entities/refresh first.",
            "connections": [],
        })

    return JSONResponse(get_entity_connections(entity_name, entities, relationships))


# ─────────────────────────────────────────────
# REGISTER FUNCTION
# ─────────────────────────────────────────────
def register_intelligence(app: FastAPI):
    """Attach all new intelligence routes to the FastAPI app."""
    app.include_router(scanner_router)
    app.include_router(router)