import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def rank_documents_by_representativeness(
    cluster_embeddings: np.ndarray,
    cluster_filenames: list[str]
) -> dict:
    centroid   = cluster_embeddings.mean(axis=0, keepdims=True)
    sims       = cosine_similarity(cluster_embeddings, centroid).flatten()
    ranked     = sorted(zip(cluster_filenames, sims.tolist()), key=lambda x: -x[1])
    ranked_out = [{"filename": fn, "similarity": round(sim, 4)} for fn, sim in ranked]
    return {"ranked_documents": ranked_out, "most_representative": ranked[0][0] if ranked else None}
