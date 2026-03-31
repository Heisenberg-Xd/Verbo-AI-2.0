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
    for file in files:
        path    = os.path.join(UPLOAD_FOLDER, file.filename)
        content = await file.read()
        
        # Save to disk
        with open(path, "wb") as f:
            f.write(content)
            
        # Persist to Supabase if workspace_id provided
        if workspace_id:
            try:
                # We assume text content for simplicity as per existing pipeline
                text_content = content.decode("utf-8", errors="ignore")
                add_document_to_workspace(workspace_id, file.filename, text_content)
            except Exception as e:
                print(f"[Upload DB Error] {e}")
                
        saved.append(file.filename)
        
    return JSONResponse({"file_paths": saved})
