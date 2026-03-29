import os
import matplotlib.pyplot as plt
from config.settings import GRAPH_FOLDER

def save_elbow_graph(K, distortions):
    path = os.path.join(GRAPH_FOLDER, "elbow_method.png")
    plt.figure(figsize=(8, 6))
    plt.plot(list(K), distortions, marker='o', color='royalblue')
    plt.xlabel("Number of Clusters")
    plt.ylabel("Distortion (Inertia)")
    plt.title("Elbow Method — Optimal K")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    return path

def save_silhouette_graph(K, silhouette_scores):
    path = os.path.join(GRAPH_FOLDER, "silhouette_method.png")
    plt.figure(figsize=(8, 6))
    plt.plot(list(K), silhouette_scores, marker='x', color='crimson')
    plt.xlabel("Number of Clusters")
    plt.ylabel("Silhouette Score")
    plt.title("Silhouette Method — Cluster Quality")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    return path
