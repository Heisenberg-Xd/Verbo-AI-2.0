import matplotlib
matplotlib.use('Agg')

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from config.settings import API_TITLE, API_VERSION, ALLOWED_ORIGINS
from utils.file_manager import init_folders
from database.db import engine, Base

from api.upload_routes import router as upload_router
from api.pipeline_routes import router as pipeline_router
from api.file_routes import router as file_router
from api.report_routes import router as report_router
from api.health_routes import router as health_router
from api.ingestion_routes import router as ingestion_router

from rag_extension import register_rag
from intelligence_extension import register_intelligence
from migrations import _safe_migrate

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)

# ─────────────────────────────────────────────
# Lifespan — startup/shutdown
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────
    init_folders()
    
    # Initialize DB tables
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    # Safe schema migrations (adds new columns/indexes if missing)
    try:
        _safe_migrate()
    except Exception as e:
        logger.error(f"Schema migration failed: {e}")

    # Pre-warm GLiNER so first pipeline run isn't slow
    try:
        from services.entity_extractor import _load_gliner
        logger.info("Pre-warming GLiNER model...")
        _load_gliner()
        logger.info("GLiNER ready.")
    except Exception as e:
        logger.warning(f"GLiNER pre-warm failed (will retry on first request): {e}")

    # Pre-warm spaCy fallback
    try:
        from services.entity_extractor import _load_spacy
        _load_spacy()
        logger.info("spaCy ready.")
    except Exception as e:
        logger.warning(f"spaCy pre-warm failed: {e}")

    yield  # app runs here

    # ── Shutdown ─────────────────────────────
    try:
        from folder_watcher import stop_folder_watcher
        stop_folder_watcher()
    except Exception:
        pass
    try:
        from gdrive_sync import stop_gdrive_sync
        stop_gdrive_sync()
    except Exception:
        pass
    logger.info("Shutting down VerboAI backend.")


# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(
    title    = API_TITLE,
    version  = API_VERSION,
    lifespan = lifespan,       # replaces deprecated @app.on_event
)

# ── CORS Middleware ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
    expose_headers    = ["*"],
)

# ── Exception handlers (preserve CORS headers) ──
@app.exception_handler(Exception)
async def _cors_500(request: Request, exc: Exception):
    origin = request.headers.get("origin", ALLOWED_ORIGINS[0])
    logger.exception(f"Unhandled 500 on {request.url.path}: {exc}")
    return JSONResponse(
        status_code = 500,
        content     = {"detail": str(exc)},
        headers     = {
            "Access-Control-Allow-Origin":      origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.exception_handler(404)
async def _cors_404(request: Request, exc):
    origin = request.headers.get("origin", ALLOWED_ORIGINS[0])
    return JSONResponse(
        status_code = 404,
        content     = {"detail": f"Route not found: {request.url.path}"},
        headers     = {"Access-Control-Allow-Origin": origin},
    )

# ── Static Files ──────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ───────────────────────────────────
app.include_router(upload_router)
app.include_router(pipeline_router)
app.include_router(file_router)
app.include_router(report_router)
app.include_router(health_router)
app.include_router(ingestion_router)

# ── Extensions ────────────────────────────────
register_rag(app)
register_intelligence(app)

# ── Cache Management Endpoints ────────────────
from cache_manager import clear_all_caches, get_cache_stats

@app.delete("/cache/clear", tags=["Cache"])
async def cache_clear():
    """Clear all caches. Useful for development/debugging."""
    result = clear_all_caches()
    return {"status": "all_caches_cleared", "cleared": result}

@app.get("/cache/stats", tags=["Cache"])
async def cache_stats():
    """Return current cache statistics."""
    return get_cache_stats()

# ── Entrypoint ────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)