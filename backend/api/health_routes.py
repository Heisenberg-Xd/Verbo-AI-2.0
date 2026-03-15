from fastapi import APIRouter
from config.settings import API_TITLE, API_VERSION

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status":  "online",
        "system":  API_TITLE,
        "version": API_VERSION,
        "rag":     "enabled",
        "intelligence": "enabled",
        "features": [
            "workspace_management", "google_drive_ingestion",
            "entity_extraction",    "relationship_detection",
            "knowledge_graph",      "entity_investigation",
            "rag_chat",
        ],
    }
