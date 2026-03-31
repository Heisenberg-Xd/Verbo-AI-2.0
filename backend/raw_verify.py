from database.db import engine
from sqlalchemy import text

def raw_verify():
    with engine.connect() as conn:
        print("--- Table Existence Check ---")
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).fetchall()
        for t in tables:
            print(f"Table: {t[0]}")
            
        print("\n--- Row Counts ---")
        for t in tables:
            name = t[0]
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar()
                print(f"{name}: {count}")
            except Exception as e:
                print(f"Error counting {name}: {e}")

if __name__ == "__main__":
    raw_verify()
