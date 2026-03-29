import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─────────────────────────────────────────────
# FOLDER SETUP
# ─────────────────────────────────────────────
UPLOAD_FOLDER      = "uploads"
GRAPH_FOLDER       = "static/graphs"
TRANSLATED_FOLDER  = "translated"
KNOWLEDGE_BASE_DIR = "Knowledge_Base"
REPORTS_DIR        = "reports"

# ─────────────────────────────────────────────
# API METADATA
# ─────────────────────────────────────────────
API_TITLE = "VerboAI Intelligence Engine"
API_VERSION = "3.0.0"

# ─────────────────────────────────────────────
# CORS SETTINGS
# ─────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "*", # Added as fallback from prompt example
]

# ─────────────────────────────────────────────
# AI SETTINGS
# ─────────────────────────────────────────────
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'
STOPWORDS_PATH = './stopwords_english.txt'
TRANSLATE_CHUNK_SIZE = 4500
NON_ASCII_THRESHOLD = 0.25
MAX_CLUSTERS = 10
LABEL_STOPWORDS = {
    'technova', 'hindi', 'marathi', 'english', 'also', 'well',
    'will', 'use', 'used', 'using', 'new', 'one', 'two', 'three',
    'said', 'say', 'get', 'got', 'like', 'just', 'may', 'also',
}
