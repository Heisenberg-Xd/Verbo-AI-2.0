"""
migrate_fingerprint.py
Adds the content_fingerprint column and composite index to the existing verbo.db.
Run once: python migrate_fingerprint.py
"""
import sqlite3

db_path = "verbo.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# --- intelligence_results: add content_fingerprint column ---
cur.execute("PRAGMA table_info(intelligence_results)")
cols = [row[1] for row in cur.fetchall()]
print("intelligence_results columns:", cols)

if "content_fingerprint" not in cols:
    cur.execute("ALTER TABLE intelligence_results ADD COLUMN content_fingerprint TEXT")
    conn.commit()
    print("Added content_fingerprint column to intelligence_results")
else:
    print("content_fingerprint already exists, skipping")

# --- file_hashes: create composite index ---
cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
idxs = [row[0] for row in cur.fetchall()]
print("Existing indexes:", idxs)

if "ix_file_hashes_ws_hash" not in idxs:
    cur.execute(
        "CREATE INDEX IF NOT EXISTS ix_file_hashes_ws_hash "
        "ON file_hashes (workspace_id, hash_digest)"
    )
    conn.commit()
    print("Created composite index ix_file_hashes_ws_hash")
else:
    print("Index ix_file_hashes_ws_hash already exists")

conn.close()
print("Migration complete.")
