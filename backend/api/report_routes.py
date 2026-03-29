import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from config.settings import REPORTS_DIR

router = APIRouter()

@router.get("/report")
async def download_report():
    path = os.path.join(REPORTS_DIR, "intelligence_report.json")
    if os.path.exists(path):
        return FileResponse(path, media_type="application/json",
                            filename="intelligence_report.json")
    raise HTTPException(status_code=404, detail="Report not yet generated. Run /process first.")
