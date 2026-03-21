import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List
import zipfile
import io
from config.settings import UPLOAD_FOLDER, TRANSLATED_FOLDER

router = APIRouter()

class ClusterZipRequest(BaseModel):
    cluster_name: str
    files: List[str]

@router.get("/files/{filename}")
async def serve_file(filename: str):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="File not found")

@router.get("/translated/{filename}")
async def serve_translated(filename: str):
    path = os.path.join(TRANSLATED_FOLDER, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Translated file not found")
@router.post("/download-cluster-zip")
async def download_cluster_zip(req: ClusterZipRequest):
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in req.files:
            # Translated filename pattern
            trans_fname = fname.replace(".txt", "_translated.txt")
            trans_path = os.path.join(TRANSLATED_FOLDER, trans_fname)
            
            if os.path.exists(trans_path):
                zf.write(trans_path, arcname=f"{req.cluster_name}/translated/{trans_fname}")
            
            # Optionally include original
            orig_path = os.path.join(UPLOAD_FOLDER, fname)
            if os.path.exists(orig_path):
                zf.write(orig_path, arcname=f"{req.cluster_name}/original/{fname}")
                
    zip_buffer.seek(0)
    
    # Format filename safe
    safe_name = "".join(c if c.isalnum() else "_" for c in req.cluster_name)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_files.zip"}
    )
