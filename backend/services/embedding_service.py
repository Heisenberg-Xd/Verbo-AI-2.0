import numpy as np
from sentence_transformers import SentenceTransformer
from config.settings import EMBEDDING_MODEL_NAME
from cache_manager import get_cache, set_cache, make_cache_key

embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

def generate_embeddings(texts: list[str]) -> np.ndarray:
    # ── Cache check: avoid re-encoding identical text sets ────────────
    cache_key = make_cache_key("emb", *sorted(texts))
    cached = get_cache("embeddings", cache_key)
    if cached is not None:
        return cached

    # ── Original computation (untouched) ─────────────────────────────
    result = embedding_model.encode(texts, show_progress_bar=False)

    # ── Store in cache ───────────────────────────────────────────────
    set_cache("embeddings", cache_key, result)
    return result
