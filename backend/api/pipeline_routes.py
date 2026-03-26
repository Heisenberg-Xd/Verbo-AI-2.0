import os
import logging
import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models.schemas import ProcessRequest
from pipelines.intelligence_pipeline import run_intelligence_pipeline
from rag_extension import rag_store
from cache_manager import get_cache, set_cache, make_cache_key, clear_cache

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/process")
async def process_files(request: ProcessRequest):
    workspace_id = request.workspace_id

    # ── Cache check: skip entire pipeline if same files were processed ────
    pipeline_cache_key = make_cache_key("pipeline", sorted(request.file_paths))
    cached_res = get_cache("pipeline", pipeline_cache_key)

    if cached_res is not None:
        # Deserialize numpy arrays from cached lists
        res = dict(cached_res)
        res["embeddings"] = np.array(res["embeddings"], dtype="float32")
        res["labels"] = np.array(res["labels"], dtype="int32")
    else:
        # ── Original pipeline execution (untouched) ──────────────────────
        res = run_intelligence_pipeline(request.file_paths, workspace_id)

        # ── Store in cache (serialize numpy for safe storage) ────────────
        cache_copy = dict(res)
        cache_copy["embeddings"] = res["embeddings"].tolist()
        cache_copy["labels"] = res["labels"].tolist()
        set_cache("pipeline", pipeline_cache_key, cache_copy)

        # Invalidate RAG chat cache since new documents were processed
        clear_cache("rag_chat")

    # Extract results for easier readability
    clusters_output = res["clusters_output"]
    viz_data = res["viz_data"]
    summaries_output = res["summaries_output"]
    sentiment_output = res["sentiment_output"]
    lang_dist_output = res["lang_dist_output"]
    overall_lang_dist = res["overall_lang_dist"]
    keywords_output = res["keywords_output"]
    representative_output = res["representative_output"]
    insight_list = res["insight_list"]
    translated_files = res["translated_files"]
    lang_per_file = res["lang_per_file"]
    elbow_path = res["elbow_path"]
    silhouette_path = res["silhouette_path"]
    report = res["report"]
    file_names = res["file_names"]
    raw_texts = res["raw_texts"]
    embeddings = res["embeddings"]
    labels = res["labels"]

    # ── Step RAG: populate in-memory vector store ─────────────────────────
    cluster_id_to_name  = {ins["cluster_id"]: ins["cluster_name"] for ins in insight_list}
    keywords_by_cluster = {ins["cluster_name"]: ins["top_keywords"] for ins in insight_list}
    rag_store.ingest(
        file_names           = file_names,
        raw_texts            = raw_texts,
        embeddings           = embeddings,
        labels               = labels,
        cluster_names        = cluster_id_to_name,
        lang_per_file        = lang_per_file,
        keywords_per_cluster = keywords_by_cluster,
    )

    # ── Step Workspace: optional intelligence integration ─────────────────
    if workspace_id:
        try:
            from services.workspace_manager import (
                update_workspace_documents, update_workspace_insights
            )
            doc_text_map = dict(zip(file_names, raw_texts))
            update_workspace_documents(workspace_id, file_names, doc_text_map)
            update_workspace_insights(workspace_id, insight_list)
        except Exception as e:
            print(f"[Workspace integration warning] {e}")

    # ── Final Response ────────────────────────────────────────────────────
    return JSONResponse({
        "clusters":                       clusters_output,
        "cluster_visualization_data":     viz_data,
        "summaries":                      summaries_output,
        "sentiment":                      sentiment_output,
        "language_distribution":          lang_dist_output,
        "overall_language_distribution":  overall_lang_dist,
        "keywords":                       keywords_output,
        "representative_docs":            representative_output,
        "insight_data":                   insight_list,
        "translated_files":               translated_files,
        "file_languages":                 {fn: {"source": lang_per_file.get(fn, "en"), "target": "en"}
                                           for fn in file_names},
        "elbow_graph":                    f"/static/graphs/{os.path.basename(elbow_path)}" if elbow_path else "",
        "silhouette_graph":               f"/static/graphs/{os.path.basename(silhouette_path)}" if silhouette_path else "",
        "intelligence_report":            report,
        "rag_ready":                      True,
        "rag_chunks_indexed":             len(rag_store.chunks),
        "workspace_id":                   workspace_id,
    })

