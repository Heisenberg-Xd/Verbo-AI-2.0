import os
import numpy as np
import logging
from typing import Optional, Dict, Any
from config.settings import UPLOAD_FOLDER
from deduplication import sha256_hash

logger = logging.getLogger(__name__)

DOC_CACHE_DIR = os.path.join(UPLOAD_FOLDER, ".doc_cache")
os.makedirs(DOC_CACHE_DIR, exist_ok=True)

def get_cached_document_intelligence(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve pre-computed NLP and Embedding results for a document 
    based on its SHA-256 hash.
    """
    try:
        digest = sha256_hash(file_path)
        cache_file = os.path.join(DOC_CACHE_DIR, f"{digest}.npz")
        
        if os.path.exists(cache_file):
            data = np.load(cache_file, allow_pickle=True)
            return {
                "lang": data["lang"].item() if hasattr(data["lang"], "item") else str(data["lang"]),
                "translated_text": str(data["translated_text"]),
                "preprocessed": str(data["preprocessed"]),
                "embedding": data["embedding"]
            }
    except Exception as e:
        logger.warning(f"Failed to load document intelligence cache for {file_path}: {e}")
        
    return None

def set_cached_document_intelligence(
    file_path: str, 
    lang: str, 
    translated_text: str, 
    preprocessed: str, 
    embedding: np.ndarray
) -> None:
    """
    Persist NLP and Embedding results for a document to disk,
    keyed by its SHA-256 hash.
    """
    try:
        digest = sha256_hash(file_path)
        cache_file = os.path.join(DOC_CACHE_DIR, f"{digest}.npz")
        
        np.savez_compressed(
            cache_file,
            lang=lang,
            translated_text=translated_text,
            preprocessed=preprocessed,
            embedding=embedding
        )
    except Exception as e:
        logger.warning(f"Failed to save document intelligence cache for {file_path}: {e}")
