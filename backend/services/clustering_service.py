import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from utils.visualization import save_elbow_graph, save_silhouette_graph
from config.settings import MAX_CLUSTERS

def find_optimal_clusters(data: np.ndarray, max_clusters_limit: int = MAX_CLUSTERS):
    n = data.shape[0]
    K = range(2, min(max_clusters_limit + 1, n))
    if len(K) < 1:
        return 2, None, None

    distortions, silhouette_scores = [], []
    for k in K:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        kmeans.fit(data)
        distortions.append(kmeans.inertia_)
        labels = kmeans.labels_
        silhouette_scores.append(
            silhouette_score(data, labels) if len(set(labels)) > 1 else -1
        )

    elbow_path = save_elbow_graph(list(K), distortions)
    silhouette_path = save_silhouette_graph(list(K), silhouette_scores)

    # Prepare raw data points for frontend charts
    elbow_data = [{"k": k, "score": float(d)} for k, d in zip(K, distortions)]
    silhouette_data = [{"k": k, "score": float(s)} for k, s in zip(K, silhouette_scores)]

    valid   = [s for s in silhouette_scores if s != -1]
    optimal = list(K)[silhouette_scores.index(max(valid))] if valid else 2
    
    return optimal, elbow_path, silhouette_path, elbow_data, silhouette_data

def compute_2d_visualization(embeddings: np.ndarray, labels, file_names: list[str]) -> list[dict]:
    pca    = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(embeddings)
    return [
        {"filename": fn, "cluster_id": int(labels[i]),
         "x": float(round(coords[i][0], 6)), "y": float(round(coords[i][1], 6))}
        for i, fn in enumerate(file_names)
    ]
