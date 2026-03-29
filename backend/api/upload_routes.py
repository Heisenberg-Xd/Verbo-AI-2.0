import os
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List
from config.settings import UPLOAD_FOLDER

router = APIRouter()

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    saved = []
    for file in files:
        path    = os.path.join(UPLOAD_FOLDER, file.filename)
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        saved.append(file.filename)
    return JSONResponse({"file_paths": saved})
