import os
import logging
import numpy as np
from sklearn.cluster import KMeans
from fastapi import HTTPException

from config.settings import UPLOAD_FOLDER, TRANSLATED_FOLDER
from services.language_service import detect_language
from services.translation_service import translate_to_english
from services.preprocessing_service import preprocess_text
from services.embedding_service import generate_embeddings
from services.clustering_service import find_optimal_clusters, compute_2d_visualization
from services.summarization_service import generate_summary
from services.sentiment_service import analyze_sentiment
from services.keywords_service import get_top_keywords, get_cluster_topic
from services.ranking_service import rank_documents_by_representativeness
from analytics.insights_generator import organize_knowledge_base
from analytics.report_generator import generate_intelligence_report

logger = logging.getLogger(__name__)

def run_intelligence_pipeline(file_paths, workspace_id=None):
    raw_texts          = []
    preprocessed_texts = []
    file_names         = []
    translated_files   = {}
    lang_per_file      = {}

    # ── Step 1: Detect → Translate → Preprocess ───────────────────────────
    for fname in file_paths:
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if not (fpath.endswith(".txt") and os.path.exists(fpath)):
            continue

        with open(fpath, "r", encoding="utf-8") as f:
            original_text = f.read()

        if not original_text.strip():
            logger.warning(f"Skipping empty file: {fname}")
            continue

        lang = detect_language(original_text)
        lang_per_file[fname] = lang

        translated_text = translate_to_english(original_text, lang)

        trans_fname = fname.replace(".txt", "_translated.txt")
        trans_path  = os.path.join(TRANSLATED_FOLDER, trans_fname)
        with open(trans_path, "w", encoding="utf-8") as tf:
            tf.write(translated_text)
        translated_files[fname] = trans_fname

        preprocessed = preprocess_text(translated_text)

        # ── Bug 4 fix: skip files that preprocess to empty ────────────────
        # Empty preprocessed text → zero/uniform embedding → corrupts clusters
        if not preprocessed.strip():
            logger.warning(f"Skipping {fname}: preprocessed to empty string")
            continue

        raw_texts.append(translated_text)
        preprocessed_texts.append(preprocessed)
        file_names.append(fname)

    if len(file_names) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 valid .txt files required for clustering."
        )

    # ── Step 2: Sentence-BERT Embeddings ──────────────────────────────────
    embeddings = generate_embeddings(preprocessed_texts)

    # ── Bug 5 fix: validate embeddings before clustering ──────────────────
    # Duplicate or near-identical embeddings (from empty/uniform text) cause
    # silhouette_score to crash or return -1 for all k, forcing optimal_k=2
    if embeddings.shape[0] != len(file_names):
        raise HTTPException(
            status_code=500,
            detail=f"Embedding count mismatch: {embeddings.shape[0]} vs {len(file_names)} files"
        )

    # ── Step 3: Optimal Clusters + Graphs ─────────────────────────────────
    optimal_k, elbow_path, silhouette_path = find_optimal_clusters(embeddings)

    kmeans = KMeans(n_clusters=optimal_k, n_init=10, random_state=42)
    kmeans.fit(embeddings)
    labels = kmeans.labels_

    # ── Step 4: 2D Visualization (PCA) ────────────────────────────────────
    viz_data = compute_2d_visualization(embeddings, labels, file_names)

    # ── Step 5: Per-Cluster Analysis ──────────────────────────────────────
    clusters_output        = {}
    summaries_output       = {}
    sentiment_output       = {}
    lang_dist_output       = {}
    keywords_output        = {}
    representative_output  = {}
    insight_list           = []

    for cluster_id in sorted(set(labels)):
        indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]

        c_texts      = [preprocessed_texts[i] for i in indices]
        c_raw_texts  = [raw_texts[i]           for i in indices]
        c_files      = [file_names[i]           for i in indices]
        c_embeddings = embeddings[indices]
        c_langs      = [lang_per_file[fn]       for fn in c_files]

        summary   = generate_summary(c_raw_texts)
        sentiment = analyze_sentiment(c_raw_texts)

        kws        = get_top_keywords(c_texts, top_n=10)
        topic_name = get_cluster_topic(kws, context_text=summary)

        base_name, counter = topic_name, 1
        while topic_name in clusters_output:
            topic_name = f"{base_name}_{counter}"
            counter += 1

        lang_dist: dict = {}
        for lg in c_langs:
            lang_dist[lg] = lang_dist.get(lg, 0) + 1

        rep = rank_documents_by_representativeness(c_embeddings, c_files)

        clusters_output[topic_name]       = c_files
        summaries_output[topic_name]      = summary
        sentiment_output[topic_name]      = sentiment
        lang_dist_output[topic_name]      = lang_dist
        keywords_output[topic_name]       = kws
        representative_output[topic_name] = rep


        insight = {
            "cluster_name":                 topic_name,
            "cluster_id":                   int(cluster_id),
            "summary":                      summary,
            "sentiment":                    sentiment,
            "dominant_language":            max(lang_dist, key=lang_dist.get),
            "top_keywords":                 kws,
            "most_representative_document": rep["most_representative"],
            "document_count":               len(c_files),
            "files":                        c_files,
            "language_distribution":        lang_dist,
        }
        insight_list.append(insight)

        organize_knowledge_base(
            cluster_name      = topic_name,
            file_names        = c_files,
            translated_files  = translated_files,
            summary           = summary,
            sentiment         = sentiment,
            lang_distribution = lang_dist,
            keywords          = kws,
            cluster_id        = int(cluster_id),
        )

    # ── Step 6: Overall Language Distribution ─────────────────────────────
    overall_lang_dist: dict = {}
    for lang in lang_per_file.values():
        overall_lang_dist[lang] = overall_lang_dist.get(lang, 0) + 1

    # ── Step 7: Intelligence Report ───────────────────────────────────────
    report = generate_intelligence_report(file_names, lang_per_file, insight_list)

    return {
        "clusters_output":      clusters_output,
        "viz_data":             viz_data,
        "summaries_output":     summaries_output,
        "sentiment_output":     sentiment_output,
        "lang_dist_output":     lang_dist_output,
        "overall_lang_dist":    overall_lang_dist,
        "keywords_output":      keywords_output,
        "representative_output": representative_output,
        "insight_list":         insight_list,
        "translated_files":     translated_files,
        "lang_per_file":        lang_per_file,
        "elbow_path":           elbow_path,
        "silhouette_path":      silhouette_path,
        "report":               report,
        "file_names":           file_names,
        "raw_texts":            raw_texts,
        "embeddings":           embeddings,
        "labels":               labels,
    }