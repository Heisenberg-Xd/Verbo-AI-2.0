"""
rag_extension.py
────────────────────────────────────────────────────────────────────
RAG (Retrieval-Augmented Generation) extension for the Multilingual
AI Intelligence Engine.

DROP-IN addition — paste the imports and call register_rag(app) at
the bottom of main.py.  Nothing in main.py needs to change.
────────────────────────────────────────────────────────────────────
"""

# ── Caching import ────────────────────────────────────────────────
from __future__ import annotations
from cache_manager import get_cache, set_cache, make_cache_key, clear_cache

import os
import re
import json

# Auto-load .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # pip install python-dotenv to use .env files
import textwrap
from typing import List, Optional, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity

# ── Gemini client (pip install google-genai) ─────────────────────
try:
    from google import genai as genai_new
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False


# ═════════════════════════════════════════════════════════════════
# RAG STATE  (in-memory vector store — lives for the server process)
# ═════════════════════════════════════════════════════════════════

class RAGStore:
    """
    Lightweight in-process vector store.

    After /process completes, call  rag_store.ingest(...)  to populate
    it with the per-file chunks, embeddings, and metadata that the
    main pipeline already computed.
    """

    def __init__(self) -> None:
        self.chunks:      List[str]        = []   # raw text chunks
        self.embeddings:  Optional[np.ndarray] = None  # (N, D) float32
        self.metadata:    List[Dict[str, Any]] = []   # per-chunk metadata
        self._ready:      bool             = False

    # ── Ingestion ─────────────────────────────────────────────────
    def ingest(
        self,
        file_names:   List[str],
        raw_texts:    List[str],
        embeddings:   np.ndarray,
        labels:       np.ndarray,
        cluster_names: Dict[int, str],
        lang_per_file: Dict[str, str],
        keywords_per_cluster: Dict[str, List[str]],
    ) -> None:
        """
        Chunk each document into sentences, embed (reusing the doc
        embedding for single-chunk docs, or re-encoding chunks when
        the document is long), and store everything.
        """
        self.chunks    = []
        self.metadata  = []
        chunk_embeddings: List[np.ndarray] = []

        # ── Updated to use new service modules ───────────────────────
        from services.preprocessing_service import preprocess_text
        from services.embedding_service import embedding_model

        for i, (fname, text) in enumerate(zip(file_names, raw_texts)):
            cluster_id   = int(labels[i])
            cluster_name = cluster_names.get(cluster_id, f"cluster_{cluster_id}")
            lang         = lang_per_file.get(fname, "unknown")
            keywords     = keywords_per_cluster.get(cluster_name, [])

            # Split document into sentence-level chunks (≤ 5 sentences each)
            sentences = re.split(r'(?<=[.!?])\s+', text.strip())
            sentences = [s.strip() for s in sentences if s.strip()]
            window    = 5      # sentences per chunk
            stride    = 3      # overlap

            doc_chunks: List[str] = []
            if len(sentences) <= window:
                doc_chunks = [' '.join(sentences)]
            else:
                for start in range(0, len(sentences) - window + 1, stride):
                    doc_chunks.append(' '.join(sentences[start:start + window]))
                # tail
                if len(sentences) % stride != 0:
                    doc_chunks.append(' '.join(sentences[-window:]))

            # Encode chunks
            preprocessed_chunks = [preprocess_text(ch) for ch in doc_chunks]
            if len(doc_chunks) == 1:
                # Reuse the already-computed document embedding
                chunk_embs = embeddings[i:i+1]
            else:
                chunk_embs = embedding_model.encode(
                    preprocessed_chunks, show_progress_bar=False
                )

            for j, (chunk, emb) in enumerate(zip(doc_chunks, chunk_embs)):
                self.chunks.append(chunk)
                self.metadata.append({
                    "filename":     fname,
                    "chunk_index":  j,
                    "cluster_id":   cluster_id,
                    "cluster_name": cluster_name,
                    "language":     lang,
                    "keywords":     keywords,
                })
                chunk_embeddings.append(emb)

        self.embeddings = np.vstack(chunk_embeddings).astype("float32")
        self._ready     = True

        # ── Invalidate RAG chat cache on re-ingest ───────────────────
        clear_cache("rag_chat")

    # ── Retrieval ─────────────────────────────────────────────────
    def retrieve(
        self,
        query_embedding: np.ndarray,
        top_k: int = 6,
        cluster_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Return the top-k most similar chunks (with metadata).
        Optionally restrict to a single cluster.
        """
        if not self._ready or self.embeddings is None:
            return []

        sims = cosine_similarity(
            query_embedding.reshape(1, -1), self.embeddings
        ).flatten()

        # Build candidate index list
        candidates = list(range(len(self.chunks)))
        if cluster_filter:
            candidates = [
                idx for idx in candidates
                if self.metadata[idx]["cluster_name"] == cluster_filter
            ]

        if not candidates:
            return []

        candidate_sims = [(idx, sims[idx]) for idx in candidates]
        candidate_sims.sort(key=lambda x: -x[1])
        top = candidate_sims[:top_k]

        results = []
        for idx, score in top:
            results.append({
                "chunk":        self.chunks[idx],
                "similarity":   round(float(score), 4),
                **self.metadata[idx],
            })
        return results

    @property
    def is_ready(self) -> bool:
        return self._ready

    def clear(self) -> None:
        self.chunks     = []
        self.embeddings = None
        self.metadata   = []
        self._ready     = False
        # ── Invalidate RAG chat cache on clear ───────────────────────
        clear_cache("rag_chat")


# Global singleton
rag_store = RAGStore()


# ═════════════════════════════════════════════════════════════════
# SCHEMAS
# ═════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    query:          str
    cluster_filter: Optional[str] = None   # restrict to one cluster
    top_k:          int            = 6
    model:          str            = "gemini-2.0-flash-lite"

class ChatResponse(BaseModel):
    answer:        str
    sources:       List[Dict[str, Any]]
    cluster_scope: Optional[str]
    query:         str


# ═════════════════════════════════════════════════════════════════
# LLM ANSWER GENERATION
# ═════════════════════════════════════════════════════════════════

_SYSTEM_PROMPT = textwrap.dedent("""
    You are a knowledgeable, friendly research assistant helping a user explore and understand
    their uploaded document collection. Think of yourself as a brilliant friend who has just
    read all of their files and is now happy to discuss anything in them.

    TONE & STYLE
    - Write the way a thoughtful human expert would speak: warm, clear, direct.
    - Flowing prose paragraphs are your default. Only use bullet lists when there are genuinely
      3+ distinct parallel items that would be confusing in prose.
    - Use natural transitions: "What's interesting here is...", "In essence,", "Worth noting is...",
      "Across these documents,", "Taken together,", "The core idea is..." etc.
    - Be precise but never stiff. Research-friendly means enlightening, not academic-robot.

    HOW TO CONSTRUCT YOUR ANSWER
    1. Lead with a clear, direct answer in your own synthesized words — do NOT open with
       "Based on the provided excerpts" or any variant of that phrase. Ever.
    2. Develop the answer by weaving ideas from the documents together naturally. You are
       SYNTHESIZING, not copy-pasting. Rephrase, connect, and explain.
    3. Cite sources lightly and naturally inline, e.g. "as [filename.txt] explains" or
       "the documents highlight". Do not dump [Source 1][Source 2] chains.
    4. If multiple documents cover the topic from different angles, surface those differences
       or complementary views — that's genuinely useful.
    5. Close with a brief, insightful takeaway sentence when it adds value.
    6. If the excerpts genuinely don't contain enough to answer well, say so honestly and
       warmly, and share what you CAN say from them.

    STRICT NEVER LIST
    - Never paste raw document sentences verbatim as the answer.
    - Never start with "Based on the provided...", "According to the excerpts...", "The documents state..."
    - Never use hollow filler phrases like "It is worth noting that..." to pad the response.
    - Never repeat the user's question back to them.
    - Never use more than one level of bullet nesting.
""").strip()


def _build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved chunks into a clean, readable context block."""
    lines = []
    for i, item in enumerate(retrieved_chunks, 1):
        lines.append(
            f"[Source {i} — {item['filename']} | cluster: {item['cluster_name']}]\n"
            f"{item['chunk'].strip()}"
        )
    return "\n\n".join(lines)


def generate_rag_answer(
    query: str,
    retrieved_chunks: List[Dict[str, Any]],
    model: str = "gemini-2.0-flash-lite",
) -> str:
    """
    Call the Gemini API (free tier, new google-genai SDK) with retrieved context.
    Returns a humanized, synthesized answer — not raw excerpts.
    Falls back to a clean sentinel when key is unavailable.
    """
    context = _build_context(retrieved_chunks)
    full_prompt = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"Here are relevant excerpts from the uploaded documents:\n\n"
        f"{context}\n\n"
        f"---\n\n"
        f"User's question: {query}\n\n"
        f"Please answer in a natural, humanized, research-friendly way."
    )

    # ── Direct REST API — no SDK version issues ──────────────────
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        import requests as _req
        # Try models in order until one works
        # Use exact model names from your API key's available models
        for _model in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"]:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.7}
            }
            try:
                r = _req.post(url, json=payload, timeout=30)
                if r.status_code == 200:
                    return r.json()["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    _last_err = f"{r.status_code}: {r.text[:300]}"
            except Exception as _e:
                _last_err = str(_e)
                continue
        raise RuntimeError(f"All Gemini models failed. Last error: {_last_err}")

    # ── Fallback sentinel (no raw dump) ──────────────────────────
    return "__no_llm__"


# ═════════════════════════════════════════════════════════════════
# REGISTER ROUTES  (called from main.py)
# ═════════════════════════════════════════════════════════════════

def register_rag(app: FastAPI) -> None:
    """
    Attach all RAG routes to an existing FastAPI application.

    Usage in main.py (add at the very bottom, after app is defined):

        from rag_extension import register_rag
        register_rag(app)
    """

    # ── POST /rag/ingest ─────────────────────────────────────────
    @app.post("/rag/ingest", tags=["RAG"])
    async def rag_ingest(payload: dict):
        """
        Internal endpoint — called automatically by /process.
        Accepts the processed pipeline output and populates the
        in-memory vector store.

        Expected payload keys:
          file_names, raw_texts, embeddings (list of lists),
          labels (list of ints), cluster_names (dict int->str),
          lang_per_file, keywords_per_cluster
        """
        try:
            rag_store.ingest(
                file_names            = payload["file_names"],
                raw_texts             = payload["raw_texts"],
                embeddings            = np.array(payload["embeddings"], dtype="float32"),
                labels                = np.array(payload["labels"],     dtype="int32"),
                cluster_names         = {int(k): v for k, v in payload["cluster_names"].items()},
                lang_per_file         = payload["lang_per_file"],
                keywords_per_cluster  = payload["keywords_per_cluster"],
            )
            return {"status": "ok", "chunks_indexed": len(rag_store.chunks)}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    # ── GET /rag/status ───────────────────────────────────────────
    @app.get("/rag/status", tags=["RAG"])
    async def rag_status():
        """Check whether the RAG index is populated and ready."""
        key = os.getenv("GEMINI_API_KEY", "")
        return {
            "ready":         rag_store.is_ready,
            "chunks_count":  len(rag_store.chunks),
            "llm_available": _GEMINI_AVAILABLE and bool(key),
            "gemini_sdk":    _GEMINI_AVAILABLE,
            "key_loaded":    bool(key),
            "key_preview":   (key[:8] + "...") if key else "NOT SET",
        }

    # ── POST /rag/chat ────────────────────────────────────────────
    @app.post("/rag/chat", tags=["RAG"])
    async def rag_chat(request: ChatRequest):
        """
        Main RAG chat endpoint.
        Wrapped in try/except so crashes return JSON (with CORS headers)
        instead of a bare 500 that strips the CORS header.
        """
        try:
            if not rag_store.is_ready:
                return JSONResponse(status_code=200, content={
                    "answer": "RAG index is not ready. Please upload files and click Run Clustering Analysis first.",
                    "sources": [], "cluster_scope": None, "query": request.query,
                })

            # ── Cache check: return cached RAG response if available ─────
            chat_cache_key = make_cache_key(
                "rag_chat", request.query,
                request.cluster_filter or "", request.top_k
            )
            cached_response = get_cache("rag_chat", chat_cache_key)
            if cached_response is not None:
                return JSONResponse(cached_response)

            # ① Embed the query
            from services.preprocessing_service import preprocess_text
            from services.embedding_service import embedding_model
            preprocessed_query = preprocess_text(request.query)
            query_emb = embedding_model.encode(
                [preprocessed_query], show_progress_bar=False
            )[0]

            # ② Retrieve relevant chunks
            retrieved = rag_store.retrieve(
                query_embedding = query_emb,
                top_k           = request.top_k,
                cluster_filter  = request.cluster_filter,
            )

            if not retrieved:
                return JSONResponse({
                    "answer":        "No relevant documents found for your query.",
                    "sources":       [],
                    "cluster_scope": request.cluster_filter,
                    "query":         request.query,
                })

            # ③ Generate grounded answer via LLM
            answer = generate_rag_answer(
                query            = request.query,
                retrieved_chunks = retrieved,
                model            = request.model,
            )

            # ④ Build deduplicated source list
            seen    = set()
            sources = []
            for chunk in retrieved:
                key = (chunk["filename"], chunk["cluster_name"])
                if key not in seen:
                    seen.add(key)
                    sources.append({
                        "filename":     chunk["filename"],
                        "cluster_name": chunk["cluster_name"],
                        "language":     chunk["language"],
                        "similarity":   chunk["similarity"],
                        "excerpt":      chunk["chunk"][:200] + "..."
                                        if len(chunk["chunk"]) > 200 else chunk["chunk"],
                    })

            response_data = {
                "answer":        answer,
                "sources":       sources,
                "cluster_scope": request.cluster_filter,
                "query":         request.query,
            }

            # ── Cache the successful response (TTL 10 min for LLM answers) ──
            set_cache("rag_chat", chat_cache_key, response_data, ttl_seconds=600)

            return JSONResponse(response_data)

        except Exception as exc:
            import traceback
            traceback.print_exc()   # prints full error to your terminal
            return JSONResponse(status_code=200, content={
                "answer":        f"⚠️ Server error: {str(exc)} — check the terminal for the full traceback.",
                "sources":       [],
                "cluster_scope": None,
                "query":         request.query,
            })

    # ── POST /rag/generate (CORS proxy for LLM generation) ───────
    @app.post("/rag/generate", tags=["RAG"])
    async def rag_generate(payload: dict):
        """
        LLM generation proxy — accepts retrieved chunks + query from the
        frontend and returns a humanized Claude answer server-side.

        This endpoint exists to avoid CORS: browsers cannot call
        api.anthropic.com directly, but FastAPI can.

        Expected payload:
          {
            "query": str,
            "chunks": [
              { "filename", "cluster_name", "language",
                "similarity", "excerpt" }, ...
            ]
          }
        """
        query  = payload.get("query", "").strip()
        chunks = payload.get("chunks", [])

        if not query:
            raise HTTPException(status_code=400, detail="query is required")
        if not chunks:
            return JSONResponse({"answer": "No relevant document excerpts were provided."})

        answer = generate_rag_answer(
            query=query,
            retrieved_chunks=[
                {
                    "chunk":        c.get("excerpt", ""),
                    "filename":     c.get("filename", "unknown"),
                    "cluster_name": c.get("cluster_name", ""),
                }
                for c in chunks
            ],
        )
        return JSONResponse({"answer": answer})

    # ── GET /rag/clusters ─────────────────────────────────────────
    @app.get("/rag/clusters", tags=["RAG"])
    async def rag_list_clusters():
        """List all cluster names available for scoped queries."""
        if not rag_store.is_ready:
            raise HTTPException(status_code=409, detail="RAG index not ready.")
        names = sorted({m["cluster_name"] for m in rag_store.metadata})
        return {"clusters": names}

    # ── DELETE /rag/reset ─────────────────────────────────────────
    @app.delete("/rag/reset", tags=["RAG"])
    async def rag_reset():
        """Clear the RAG index (useful before re-processing files)."""
        rag_store.clear()
        return {"status": "cleared"}