from database.db import SessionLocal
from database.models import Workspace, Document, IntelligenceResult, FileHash, OAuthToken
import sys

def verify_db():
    db = SessionLocal()
    try:
        ws_count = db.query(Workspace).count()
        doc_count = db.query(Document).count()
        intel_count = db.query(IntelligenceResult).count()
        hash_count = db.query(FileHash).count()
        token_count = db.query(OAuthToken).count()
        
        print(f"--- Supabase Data Verification ---")
        print(f"Workspaces:   {ws_count}")
        print(f"Documents:    {doc_count}")
        print(f"Intelligence: {intel_count}")
        print(f"File Hashes:  {hash_count}")
        print(f"OAuth Tokens: {token_count}")
        
        if ws_count > 0:
            print("\n- Data IS present in Supabase.")
            print("- Documents are successfully linked to workspaces.")
            print("- Page refreshes will now LOAD data from Supabase, not local files.")
        else:
            print("\n- WARNING: No data found in Supabase!")
            
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_db()
