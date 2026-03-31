from services.workspace_manager import get_all_workspaces, get_workspace
import logging

logging.basicConfig(level=logging.INFO)

def verify():
    workspaces = get_all_workspaces()
    print(f"Total Workspaces: {len(workspaces)}")
    for ws in workspaces:
        name = ws.get('name', 'Unknown')
        ws_id = ws.get('workspace_id')
        details = get_workspace(ws_id)
        doc_count = len(details.get('file_names', []))
        entities_count = len(details.get('entities', []))
        print(f" - {name} ({ws_id}): {doc_count} docs, {entities_count} entities")

if __name__ == "__main__":
    verify()
