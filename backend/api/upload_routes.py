import os
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List, Optional
from config.settings import UPLOAD_FOLDER
from services.workspace_manager import add_document_to_workspace

router = APIRouter()

@router.post("/upload")
async def upload_files(
    workspace_id: Optional[str] = None, 
    files: List[UploadFile] = File(...)
):
    saved = []
    file_names = []
    doc_text_map = {}
    
    # 1. Faster sequential disk writes in memory
    for file in files:
        path    = os.path.join(UPLOAD_FOLDER, file.filename)
        content = await file.read()
        
        # Save to disk
        with open(path, "wb") as f:
            f.write(content)
            
        # Keep text in memory for DB
        try:
            text_content = content.decode("utf-8", errors="ignore")
            file_names.append(file.filename)
            doc_text_map[file.filename] = text_content
        except Exception:
            pass
            
        saved.append(file.filename)

    # 2. Single bulk DB persist (no N+1 loop)
    if workspace_id and file_names:
        try:
            from services.workspace_manager import update_workspace_documents
            # optimized bulk insert under the hood
            update_workspace_documents(workspace_id, file_names, doc_text_map)
        except Exception as e:
            print(f"[Upload DB Error] {e}")
            
    return JSONResponse({"file_paths": saved})
