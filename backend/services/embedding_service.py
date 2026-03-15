import numpy as np
from sentence_transformers import SentenceTransformer
from config.settings import EMBEDDING_MODEL_NAME

embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

def generate_embeddings(texts: list[str]) -> np.ndarray:
    return embedding_model.encode(texts, show_progress_bar=False)
