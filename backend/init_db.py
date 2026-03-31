from database.db import engine, Base
from database.models import Workspace, Document, IntelligenceResult, FileHash, OAuthToken
import logging
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DB_Init")

def init_db():
    try:
        # 1. Drop all tables to start clean
        logger.info("Dropping all existing tables...")
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS intelligence_results CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS documents CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS file_hashes CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS oauth_tokens CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS workspaces CASCADE"))
            conn.commit()
            
        # 2. Create tables
        logger.info("Recreating tables via Base.metadata.create_all...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialization complete.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

if __name__ == "__main__":
    init_db()
