# ════════════════════════════════════════════════════════════════
#  PATCH for main.py — add RAG support
#  Apply the three labelled changes below. Nothing else changes.
# ════════════════════════════════════════════════════════════════

# ─── CHANGE 1 ──────────────────────────────────────────────────
# At the TOP of main.py, after all existing imports, add:

from rag_extension import register_rag, rag_store   # RAG


# ─── CHANGE 2 ──────────────────────────────────────────────────
# Inside  async def process_files(request: ProcessRequest):
# at the very end of the function, just before  return JSONResponse({...})
# add the following block:

    # ── Step RAG: populate vector store ──────────────────────────
    # Build cluster_id → cluster_name mapping from insight_list
    cluster_id_to_name = {
        insight["cluster_id"]: insight["cluster_name"]
        for insight in insight_list
    }
    keywords_by_cluster = {
        insight["cluster_name"]: insight["top_keywords"]
        for insight in insight_list
    }
    rag_store.ingest(
        file_names           = file_names,
        raw_texts            = raw_texts,
        embeddings           = embeddings,
        labels               = labels,
        cluster_names        = cluster_id_to_name,
        lang_per_file        = lang_per_file,
        keywords_per_cluster = keywords_by_cluster,
    )


# ─── CHANGE 3 ──────────────────────────────────────────────────
# At the BOTTOM of main.py, after the app is defined but before
# the  if __name__ == "__main__":  block, add:

register_rag(app)   # attach /rag/* routes


# ════════════════════════════════════════════════════════════════
# That's it — three additions, zero deletions.
# ════════════════════════════════════════════════════════════════