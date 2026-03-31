from database.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Checking/Adding last_scan column...")
        try:
            # PostgreSQL syntax to add column IF NOT EXISTS
            conn.execute(text("ALTER TABLE intelligence_results ADD COLUMN IF NOT EXISTS last_scan JSONB"))
            conn.execute(text("ALTER TABLE intelligence_results ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'"))
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS drive_connected BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255)"))
            conn.commit()
            print("Successfully updated database schema (LastScan, DriveConnected, DriveFolderID).")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    migrate()
