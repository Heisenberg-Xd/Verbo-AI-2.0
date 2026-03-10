import matplotlib
matplotlib.use('Agg')

import os
import re
import json
import shutil
import numpy as np
import matplotlib.pyplot as plt

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

from sentence_transformers import SentenceTransformer
from langdetect import detect
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from deep_translator import GoogleTranslator

import nltk
from nltk.tokenize import sent_tokenize

# ── RAG extension ────────────────────────────────────────────────
from rag_extension import register_rag, rag_store   # ← CHANGE 1

# ─────────────────────────────────────────────
# NLTK Downloads
# ─────────────────────────────────────────────
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)

# ─────────────────────────────────────────────
# FastAPI App Initialization
# ─────────────────────────────────────────────
app = FastAPI(
    title="Multilingual AI Intelligence Engine",
    description="National Competition Level — Multilingual AI Intelligence & Knowledge Organization System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# FOLDER SETUP
# ─────────────────────────────────────────────
UPLOAD_FOLDER      = "uploads"
GRAPH_FOLDER       = "static/graphs"
TRANSLATED_FOLDER  = "translated"
KNOWLEDGE_BASE_DIR = "Knowledge_Base"
REPORTS_DIR        = "reports"

for folder in [UPLOAD_FOLDER, GRAPH_FOLDER, TRANSLATED_FOLDER, KNOWLEDGE_BASE_DIR, REPORTS_DIR]:
    os.makedirs(folder, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# ─────────────────────────────────────────────
# GLOBAL MODELS & TOOLS
# ─────────────────────────────────────────────
sentiment_analyzer = SentimentIntensityAnalyzer()
embedding_model   = SentenceTransformer('all-MiniLM-L6-v2')

# ─────────────────────────────────────────────
# STOPWORDS
# ─────────────────────────────────────────────
STOPWORDS_PATH = './stopwords_english.txt'

def load_stopwords(path: str) -> set:
    if not os.path.exists(path):
        return set()
    with open(path, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f)

english_stopwords = load_stopwords(STOPWORDS_PATH)

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────
class ProcessRequest(BaseModel):
    file_paths: List[str]

# ─────────────────────────────────────────────
# ① LANGUAGE DETECTION
# ─────────────────────────────────────────────
def detect_language(text: str) -> str:
    try:
        return detect(text)
    except Exception:
        return 'unknown'

# ─────────────────────────────────────────────
# ② TRANSLATION PIPELINE
# ─────────────────────────────────────────────
def translate_to_english(text: str, lang: str) -> str:
    if lang in ('en', 'unknown'):
        return text
    try:
        return GoogleTranslator(source=lang, target='en').translate(text)
    except Exception:
        return text

# ─────────────────────────────────────────────
# ③ TEXT PREPROCESSING
# ─────────────────────────────────────────────
def preprocess_text(text: str) -> str:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    processed = []
    for sentence in sentences:
        sentence = re.sub(r'[^\w\s]', '', sentence)
        words    = sentence.split()
        filtered = [w for w in words if w.lower() not in english_stopwords]
        processed.append(' '.join(filtered))
    return ' '.join(processed)

# ─────────────────────────────────────────────
# ④ SENTENCE-BERT EMBEDDINGS
# ─────────────────────────────────────────────
def generate_embeddings(texts: List[str]) -> np.ndarray:
    return embedding_model.encode(texts, show_progress_bar=False)

# ─────────────────────────────────────────────
# ⑤ OPTIMAL CLUSTER DETECTION + GRAPH GENERATION
# ─────────────────────────────────────────────
def find_optimal_clusters(data: np.ndarray, max_clusters: int = 10):
    distortions       = []
    silhouette_scores = []
    K                 = range(2, min(max_clusters + 1, data.shape[0]))

    for k in K:
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        kmeans.fit(data)
        distortions.append(kmeans.inertia_)
        labels = kmeans.labels_
        silhouette_scores.append(
            silhouette_score(data, labels) if len(set(labels)) > 1 else -1
        )

    elbow_path = os.path.join(GRAPH_FOLDER, "elbow_method.png")
    plt.figure(figsize=(8, 6))
    plt.plot(list(K), distortions, marker='o', color='royalblue')
    plt.xlabel("Number of Clusters")
    plt.ylabel("Distortion (Inertia)")
    plt.title("Elbow Method — Optimal K")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(elbow_path)
    plt.close()

    silhouette_path = os.path.join(GRAPH_FOLDER, "silhouette_method.png")
    plt.figure(figsize=(8, 6))
    plt.plot(list(K), silhouette_scores, marker='x', color='crimson')
    plt.xlabel("Number of Clusters")
    plt.ylabel("Silhouette Score")
    plt.title("Silhouette Method — Cluster Quality")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(silhouette_path)
    plt.close()

    valid   = [s for s in silhouette_scores if s != -1]
    optimal = list(K)[silhouette_scores.index(max(valid))] if valid else 2

    return optimal, elbow_path, silhouette_path

# ─────────────────────────────────────────────
# ⑥ 2D CLUSTER VISUALIZATION (PCA)
# ─────────────────────────────────────────────
def compute_2d_visualization(embeddings: np.ndarray, labels, file_names: List[str]) -> List[dict]:
    pca    = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(embeddings)
    result = []
    for i, fname in enumerate(file_names):
        result.append({
            "filename":   fname,
            "cluster_id": int(labels[i]),
            "x":          float(round(coords[i][0], 6)),
            "y":          float(round(coords[i][1], 6))
        })
    return result

# ─────────────────────────────────────────────
# ⑦ TOPIC EXTRACTION (TF-IDF Top Keywords)
# ─────────────────────────────────────────────
def get_top_keywords(cluster_texts: List[str], top_n: int = 10) -> List[str]:
    if not cluster_texts or all(t.strip() == '' for t in cluster_texts):
        return []
    vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
    try:
        X        = vectorizer.fit_transform(cluster_texts)
        features = vectorizer.get_feature_names_out()
        summed   = X.toarray().sum(axis=0)
        indices  = summed.argsort()[::-1][:top_n]
        return [features[i] for i in indices]
    except Exception:
        return []

def get_cluster_topic(keywords: List[str]) -> str:
    return '_'.join(keywords[:2]) if keywords else 'cluster'

# ─────────────────────────────────────────────
# ⑧ AUTO CLUSTER SUMMARY (TextRank-style)
# ─────────────────────────────────────────────
def generate_summary(texts: List[str], max_sentences: int = 3) -> str:
    combined   = ' '.join(texts)
    sentences  = sent_tokenize(combined)
    if len(sentences) <= max_sentences:
        return ' '.join(sentences)

    try:
        vectorizer  = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(sentences)
        sim_matrix  = cosine_similarity(tfidf_matrix)
        scores      = sim_matrix.sum(axis=1)
        ranked_idx  = scores.argsort()[::-1][:max_sentences]
        ranked_idx  = sorted(ranked_idx)
        return ' '.join([sentences[i] for i in ranked_idx])
    except Exception:
        return ' '.join(sentences[:max_sentences])

# ─────────────────────────────────────────────
# ⑨ SENTIMENT ANALYSIS PER CLUSTER (VADER)
# ─────────────────────────────────────────────
def analyze_sentiment(texts: List[str]) -> dict:
    combined = ' '.join(texts)
    scores   = sentiment_analyzer.polarity_scores(combined)
    total    = scores['pos'] + scores['neg'] + scores['neu']
    if total == 0:
        total = 1
    return {
        "positive": round((scores['pos'] / total) * 100, 2),
        "negative": round((scores['neg'] / total) * 100, 2),
        "neutral":  round((scores['neu'] / total) * 100, 2),
        "compound": round(scores['compound'], 4)
    }

# ─────────────────────────────────────────────
# ⑩ DOCUMENT IMPORTANCE RANKING (Cosine to Centroid)
# ─────────────────────────────────────────────
def rank_documents_by_representativeness(
    cluster_embeddings: np.ndarray,
    cluster_filenames: List[str]
) -> dict:
    centroid   = cluster_embeddings.mean(axis=0, keepdims=True)
    sims       = cosine_similarity(cluster_embeddings, centroid).flatten()
    ranked     = sorted(zip(cluster_filenames, sims.tolist()), key=lambda x: -x[1])
    ranked_out = [{"filename": fn, "similarity": round(sim, 4)} for fn, sim in ranked]
    return {
        "ranked_documents":       ranked_out,
        "most_representative":    ranked[0][0] if ranked else None
    }

# ─────────────────────────────────────────────
# ⑪ KNOWLEDGE BASE AUTO ORGANIZATION
# ─────────────────────────────────────────────
def organize_knowledge_base(
    cluster_name:       str,
    file_names:         List[str],
    translated_files:   dict,
    summary:            str,
    sentiment:          dict,
    lang_distribution:  dict,
    keywords:           List[str],
    cluster_id:         int
):
    cluster_dir  = os.path.join(KNOWLEDGE_BASE_DIR, cluster_name)
    originals_dir    = os.path.join(cluster_dir, "originals")
    translations_dir = os.path.join(cluster_dir, "translations")
    os.makedirs(originals_dir,    exist_ok=True)
    os.makedirs(translations_dir, exist_ok=True)

    for fname in file_names:
        src_original = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.exists(src_original):
            shutil.copy2(src_original, os.path.join(originals_dir, fname))

        trans_name = translated_files.get(fname)
        if trans_name:
            src_translated = os.path.join(TRANSLATED_FOLDER, trans_name)
            if os.path.exists(src_translated):
                shutil.copy2(src_translated, os.path.join(translations_dir, trans_name))

    with open(os.path.join(cluster_dir, "summary.txt"), "w", encoding="utf-8") as f:
        f.write(summary)

    with open(os.path.join(cluster_dir, "sentiment.json"), "w", encoding="utf-8") as f:
        json.dump(sentiment, f, indent=2)

    metadata = {
        "cluster_id":           cluster_id,
        "cluster_name":         cluster_name,
        "summary":              summary,
        "sentiment":            sentiment,
        "language_distribution": lang_distribution,
        "keywords":             keywords,
        "document_count":       len(file_names),
        "files":                file_names
    }
    with open(os.path.join(cluster_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

# ─────────────────────────────────────────────
# ⑫ INTELLIGENCE REPORT GENERATION
# ─────────────────────────────────────────────
def generate_intelligence_report(
    file_names:           List[str],
    lang_per_file:        dict,
    cluster_insights:     List[dict]
) -> dict:
    total_docs         = len(file_names)
    total_clusters     = len(cluster_insights)
    lang_counter: dict = {}
    for lang in lang_per_file.values():
        lang_counter[lang] = lang_counter.get(lang, 0) + 1

    report = {
        "global_statistics": {
            "total_documents":    total_docs,
            "total_clusters":     total_clusters,
            "language_breakdown": lang_counter
        },
        "cluster_breakdown":  cluster_insights,
        "sentiment_analytics": {
            c["cluster_name"]: c["sentiment"] for c in cluster_insights
        },
        "language_analytics": {
            c["cluster_name"]: c["language_distribution"] for c in cluster_insights
        }
    }

    report_path = os.path.join(REPORTS_DIR, "intelligence_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report

# ─────────────────────────────────────────────
# ROUTE ① — UPLOAD
# ─────────────────────────────────────────────
@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    saved = []
    for file in files:
        path = os.path.join(UPLOAD_FOLDER, file.filename)
        content = await file.read()
        with open(path, "wb") as f:
            f.write(content)
        saved.append(file.filename)
    return JSONResponse({"file_paths": saved})

# ─────────────────────────────────────────────
# ROUTE ② — PROCESS (Main Intelligence Pipeline)
# ─────────────────────────────────────────────
@app.post("/process")
async def process_files(request: ProcessRequest):
    file_paths = request.file_paths

    raw_texts         = []
    preprocessed_texts = []
    file_names        = []
    translated_files  = {}
    lang_per_file     = {}

    # ── Step 1: Translate-first pipeline ──────────────────────────
    for fname in file_paths:
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if not (fpath.endswith(".txt") and os.path.exists(fpath)):
            continue

        with open(fpath, "r", encoding="utf-8") as f:
            original_text = f.read()

        lang = detect_language(original_text)
        lang_per_file[fname] = lang

        translated_text = translate_to_english(original_text, lang)

        trans_fname = fname.replace(".txt", "_translated.txt")
        trans_path  = os.path.join(TRANSLATED_FOLDER, trans_fname)
        with open(trans_path, "w", encoding="utf-8") as tf:
            tf.write(translated_text)
        translated_files[fname] = trans_fname

        preprocessed = preprocess_text(translated_text)

        raw_texts.append(translated_text)
        preprocessed_texts.append(preprocessed)
        file_names.append(fname)

    if len(file_names) < 2:
        raise HTTPException(status_code=400, detail="At least 2 valid .txt files required for clustering.")

    # ── Step 2: Sentence-BERT Embeddings ─────────────────────────
    embeddings = generate_embeddings(preprocessed_texts)

    # ── Step 3: Optimal Clusters + Graphs ────────────────────────
    optimal_k, elbow_path, silhouette_path = find_optimal_clusters(embeddings)

    kmeans = KMeans(n_clusters=optimal_k, n_init=10, random_state=42)
    kmeans.fit(embeddings)
    labels    = kmeans.labels_
    centroids = kmeans.cluster_centers_

    # ── Step 4: 2D Visualization (PCA) ──────────────────────────
    viz_data = compute_2d_visualization(embeddings, labels, file_names)

    # ── Step 5: Per-Cluster Analysis ─────────────────────────────
    clusters_output      = {}
    summaries_output     = {}
    sentiment_output     = {}
    lang_dist_output     = {}
    keywords_output      = {}
    representative_output = {}
    insight_list         = []

    for cluster_id in sorted(set(labels)):
        indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]

        c_texts      = [preprocessed_texts[i] for i in indices]
        c_raw_texts  = [raw_texts[i]           for i in indices]
        c_files      = [file_names[i]           for i in indices]
        c_embeddings = embeddings[indices]
        c_langs      = [lang_per_file[fn]       for fn in c_files]

        keywords   = get_top_keywords(c_texts, top_n=10)
        topic_name = get_cluster_topic(keywords)
        base_name  = topic_name
        counter    = 1
        while topic_name in clusters_output:
            topic_name = f"{base_name}_{counter}"
            counter += 1

        summary   = generate_summary(c_raw_texts)
        sentiment = analyze_sentiment(c_raw_texts)

        lang_dist: dict = {}
        for lg in c_langs:
            lang_dist[lg] = lang_dist.get(lg, 0) + 1

        rep = rank_documents_by_representativeness(c_embeddings, c_files)

        clusters_output[topic_name]       = c_files
        summaries_output[topic_name]      = summary
        sentiment_output[topic_name]      = sentiment
        lang_dist_output[topic_name]      = lang_dist
        keywords_output[topic_name]       = keywords
        representative_output[topic_name] = rep

        insight = {
            "cluster_name":               topic_name,
            "cluster_id":                 int(cluster_id),
            "summary":                    summary,
            "sentiment":                  sentiment,
            "dominant_language":          max(lang_dist, key=lang_dist.get),
            "top_keywords":               keywords,
            "most_representative_document": rep["most_representative"],
            "document_count":             len(c_files),
            "files":                      c_files,
            "language_distribution":      lang_dist
        }
        insight_list.append(insight)

        organize_knowledge_base(
            cluster_name      = topic_name,
            file_names        = c_files,
            translated_files  = translated_files,
            summary           = summary,
            sentiment         = sentiment,
            lang_distribution = lang_dist,
            keywords          = keywords,
            cluster_id        = int(cluster_id)
        )

    # ── Step 6: Overall Language Distribution ────────────────────
    overall_lang_dist: dict = {}
    for lang in lang_per_file.values():
        overall_lang_dist[lang] = overall_lang_dist.get(lang, 0) + 1

    # ── Step 7: Intelligence Report ──────────────────────────────
    report = generate_intelligence_report(file_names, lang_per_file, insight_list)

    # ── Step RAG: populate in-memory vector store ── CHANGE 2 ────
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
    # ─────────────────────────────────────────────────────────────

    # ── Final Response ────────────────────────────────────────────
    return JSONResponse({
        "clusters":                 clusters_output,
        "cluster_visualization_data": viz_data,
        "summaries":                summaries_output,
        "sentiment":                sentiment_output,
        "language_distribution":    lang_dist_output,
        "overall_language_distribution": overall_lang_dist,
        "keywords":                 keywords_output,
        "representative_docs":      representative_output,
        "insight_data":             insight_list,
        "translated_files":         translated_files,
        "elbow_graph":              f"/static/graphs/{os.path.basename(elbow_path)}",
        "silhouette_graph":         f"/static/graphs/{os.path.basename(silhouette_path)}",
        "intelligence_report":      report,
        "rag_ready":                True,         # RAG flag
        "rag_chunks_indexed":       len(rag_store.chunks),
    })

# ─────────────────────────────────────────────
# ROUTE ③ — SERVE ORIGINAL FILE
# ─────────────────────────────────────────────
@app.get("/files/{filename}")
async def serve_file(filename: str):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="File not found")

# ─────────────────────────────────────────────
# ROUTE ④ — SERVE TRANSLATED FILE
# ─────────────────────────────────────────────
@app.get("/translated/{filename}")
async def serve_translated(filename: str):
    path = os.path.join(TRANSLATED_FOLDER, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Translated file not found")

# ─────────────────────────────────────────────
# ROUTE ⑤ — DOWNLOAD INTELLIGENCE REPORT
# ─────────────────────────────────────────────
@app.get("/report")
async def download_report():
    path = os.path.join(REPORTS_DIR, "intelligence_report.json")
    if os.path.exists(path):
        return FileResponse(path, media_type="application/json", filename="intelligence_report.json")
    raise HTTPException(status_code=404, detail="Report not yet generated. Run /process first.")

# ─────────────────────────────────────────────
# ROUTE ⑥ — HEALTH CHECK
# ─────────────────────────────────────────────
@app.get("/")
async def health_check():
    return {
        "status":  "online",
        "system":  "Multilingual AI Intelligence Engine",
        "version": "2.0.0 (FastAPI)",
        "rag":     "enabled",
    }

# ── Register RAG routes ── CHANGE 3 ──────────────────────────────
register_rag(app)

# ─────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)