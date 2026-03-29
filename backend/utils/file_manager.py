import os
from config.settings import UPLOAD_FOLDER, GRAPH_FOLDER, TRANSLATED_FOLDER, KNOWLEDGE_BASE_DIR, REPORTS_DIR

def init_folders():
    for folder in [UPLOAD_FOLDER, GRAPH_FOLDER, TRANSLATED_FOLDER, KNOWLEDGE_BASE_DIR, REPORTS_DIR]:
        os.makedirs(folder, exist_ok=True)
