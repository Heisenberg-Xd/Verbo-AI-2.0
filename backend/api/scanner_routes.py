import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.contradiction_scanner import scan_for_contradictions, generate_contradiction_report
from services.workspace_manager import get_workspace
from config.settings import UPLOAD_FOLDER

router = APIRouter()

class ScanRequest(BaseModel):
    filename: str
    min_confidence: float = 0.4
    include_semantic: bool = True

class BatchScanRequest(BaseModel):
    filenames: List[str]
    min_confidence: float = 0.4

@router.post("/workspace/{workspace_id}/scan")
async def scan_document(workspace_id: str, req: ScanRequest):
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws_relationships = ws.get("relationships", [])
    if len(ws_relationships) < 5:
        raise HTTPException(status_code=400, detail="Workspace needs at least 5 relationships to scan for contradictions.")

    if req.filename in ws.get("document_texts", {}):
        raise HTTPException(status_code=400, detail="Document already exists in workspace. Cannot scan document against itself.")

    filepath = os.path.join(UPLOAD_FOLDER, req.filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=400, detail=f"File {req.filename} not found in upload folder.")

    with open(filepath, "r", encoding="utf-8") as f:
        new_document_text = f.read()

    contradictions = scan_for_contradictions(
        new_document_text=new_document_text,
        new_filename=req.filename,
        workspace_relationships=ws_relationships,
        workspace_document_texts=ws.get("document_texts", {}),
        workspace_entities=ws.get("entities", [])
    )
    
    # Filter by minimum confidence
    contradictions = [c for c in contradictions if c["confidence"] >= req.min_confidence]

    report = generate_contradiction_report(contradictions, req.filename, workspace_id)
    
    from services.workspace_manager import update_workspace_scan
    update_workspace_scan(workspace_id, report)
    
    return report

@router.post("/workspace/{workspace_id}/scan/batch")
async def batch_scan_documents(workspace_id: str, req: BatchScanRequest):
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    ws_relationships = ws.get("relationships", [])
    if len(ws_relationships) < 5:
        raise HTTPException(status_code=400, detail="Workspace needs at least 5 relationships to scan for contradictions.")

    reports = []
    has_critical = False
    has_warning = False
    
    for filename in req.filenames:
        if filename in ws.get("document_texts", {}):
            continue
            
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            new_document_text = f.read()

        contradictions = scan_for_contradictions(
            new_document_text=new_document_text,
            new_filename=filename,
            workspace_relationships=ws_relationships,
            workspace_document_texts=ws.get("document_texts", {}),
            workspace_entities=ws.get("entities", [])
        )
        
        contradictions = [c for c in contradictions if c["confidence"] >= req.min_confidence]
        report = generate_contradiction_report(contradictions, filename, workspace_id)
        
        if report["risk_level"] == "critical":
            has_critical = True
        elif report["risk_level"] == "warning":
            has_warning = True
            
        reports.append({
            "filename": filename,
            "report": report
        })
        
    combined_risk = "clean"
    if has_critical:
        combined_risk = "critical"
    elif has_warning:
        combined_risk = "warning"

    return {
        "workspace_id": workspace_id,
        "scanned_count": len(reports),
        "reports": reports,
        "combined_risk_level": combined_risk
    }

@router.get("/workspace/{workspace_id}/scan/history")
async def get_scan_history(workspace_id: str):
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if "last_scan" not in ws:
        return {"message": "No scan run yet"}
        
    return ws["last_scan"]

@router.get("/workspace/{workspace_id}/scan/entities/{entity_name}")
async def get_scan_entity_history(workspace_id: str, entity_name: str):
    ws = get_workspace(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if "last_scan" not in ws:
        return {"message": "No scan run yet"}
        
    entity_lower = entity_name.lower()
    matches = []
    
    for c in ws["last_scan"].get("contradictions", []):
        new_trip = c.get("new_claim", {}).get("triple", {})
        old_trip = c.get("conflicting_claim", {}).get("triple", {})
        
        # safely check dictionaries
        if isinstance(new_trip, dict) and any(entity_lower in str(v).lower() for v in new_trip.values() if v):
            matches.append(c)
            continue
            
        if isinstance(old_trip, dict) and any(entity_lower in str(v).lower() for v in old_trip.values() if v):
            matches.append(c)
            
    return {
        "workspace_id": workspace_id,
        "entity": entity_name,
        "scan_matches": matches
    }
