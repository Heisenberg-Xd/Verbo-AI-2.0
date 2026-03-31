import numpy as np
from sentence_transformers import SentenceTransformer
from config.settings import EMBEDDING_MODEL_NAME
from cache_manager import get_cache, set_cache, make_cache_key

import logging

try:
    # Attempt offline load first to prevent HuggingFace hub connection timeouts
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, local_files_only=True)
except Exception as e:
    logging.warning(f"Local {EMBEDDING_MODEL_NAME} model not found. Downloading...")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, local_files_only=False)

def generate_embeddings(texts: list[str]) -> np.ndarray:
    # ── Cache check: avoid re-encoding identical text sets ────────────
    cache_key = make_cache_key("emb", *sorted(texts))
    cached = get_cache("embeddings", cache_key)
    if cached is not None:
        return cached

    # ── Original computation (untouched) ─────────────────────────────
    result = embedding_model.encode(texts, batch_size=64, show_progress_bar=False)

    # ── Store in cache ───────────────────────────────────────────────
    set_cache("embeddings", cache_key, result)
    return result
