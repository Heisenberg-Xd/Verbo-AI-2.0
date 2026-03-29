# RAG service is mostly handled in rag_extension.py
# This file is for any additional RAG-related logic if needed.
# For now, we'll keep it as a placeholder or move common RAG logic here if shared.

def prepare_rag_payload(file_names, raw_texts, embeddings, labels, cluster_id_to_name, lang_per_file, keywords_by_cluster):
    return {
        "file_names": file_names,
        "raw_texts": raw_texts,
        "embeddings": embeddings.tolist(),
        "labels": labels.tolist(),
        "cluster_names": cluster_id_to_name,
        "lang_per_file": lang_per_file,
        "keywords_per_cluster": keywords_by_cluster,
    }
