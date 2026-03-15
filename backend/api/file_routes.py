import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from config.settings import UPLOAD_FOLDER, TRANSLATED_FOLDER

router = APIRouter()

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
