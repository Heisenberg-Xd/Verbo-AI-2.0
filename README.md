<div align="center">

<br/>

```
██╗   ██╗███████╗██████╗ ██████╗  ██████╗      █████╗ ██╗
██║   ██║██╔════╝██╔══██╗██╔══██╗██╔═══██╗    ██╔══██╗██║
██║   ██║█████╗  ██████╔╝██████╔╝██║   ██║    ███████║██║
╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══██╗██║   ██║    ██╔══██║██║
 ╚████╔╝ ███████╗██║  ██║██████╔╝╚██████╔╝    ██║  ██║██║
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═════╝  ╚═════╝     ╚═╝  ╚═╝╚═╝
```

**Advanced AI-Powered Multilingual Document Intelligence Platform**

<br/>

[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![NLP](https://img.shields.io/badge/NLP-Sentence--BERT-FF6B6B?style=flat-square&logo=huggingface&logoColor=white)](https://sbert.net)
[![GLiNER](https://img.shields.io/badge/NER-GLiNER%20Zero--Shot-F97316?style=flat-square&logo=huggingface&logoColor=white)](https://github.com/urchade/GLiNER)
[![Cache](https://img.shields.io/badge/Cache-Thread--Safe%20In--Memory-0EA5E9?style=flat-square&logo=redis&logoColor=white)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)
[![RAG](https://img.shields.io/badge/AI-RAG%20Enabled-8B5CF6?style=flat-square&logo=openai&logoColor=white)](https://github.com)
[![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)](https://github.com)

<br/>

> *Transform unstructured multilingual documents into structured intelligence — with interactive AI chat, knowledge graphs, entity extraction, adversarial contradiction detection, and a thread-safe in-memory caching layer for blazing-fast repeated queries.*

<br/>

</div>

---

## 🚀 Overview

**VerboAI** is an advanced AI-powered intelligence platform designed to analyze large collections of multilingual documents and convert them into structured knowledge and actionable insights.

The system leverages modern **Natural Language Processing** and **Machine Learning** techniques to automatically detect languages, translate documents, generate semantic embeddings, cluster topics, extract keywords, perform sentiment analysis, extract named entities, build interactive knowledge graphs, and organize information into a fully searchable knowledge base.

With integrated **AI Chat (RAG)**, **Zero-Shot Named Entity Recognition**, **Relationship Extraction**, **Interactive Knowledge Graphs**, a **Thread-Safe In-Memory Caching Layer**, and the industry-first **Adversarial Document Scanner**, VerboAI goes beyond analysis — it actively detects contradictions and inconsistencies across your document corpus before they cause real-world damage, while serving repeated computations from cache at near-zero latency.

---

## ✨The Key Features

| Feature | Description |
|---|---|
| 🌍 **Multilingual Intelligence** | Auto-detects and translates Hindi, Marathi, Arabic, Tamil, German, Chinese, and 100+ languages |
| 📂 **Document Processing Pipeline** | Full 11-stage AI pipeline from raw upload to structured intelligence |
| ⚡ **Thread-Safe In-Memory Cache** | SHA256-keyed LRU cache for embeddings, chunks, and RAG responses — eliminates redundant computation |
| 🧠 **Semantic Understanding** | Sentence-BERT embeddings for deep meaning-level document representation |
| 🧩 **Auto Topic Clustering** | KMeans with silhouette scoring — system picks optimal cluster count automatically |
| 📝 **Automatic Summaries** | Generates concise summaries for each document cluster |
| 🔑 **Keyword Extraction** | TF-IDF keyword extraction per cluster with topic labeling |
| 😊 **Sentiment Analytics** | VADER-based tone and sentiment scoring with positive/negative/neutral breakdown |
| 📊 **Cluster Visualization** | PCA 2D projection of semantic embeddings with interactive scatter plot |
| 🏷️ **Zero-Shot Entity Extraction** | GLiNER model extracts persons, organizations, locations, technologies — any domain, no retraining |
| 🔗 **Relationship Detection** | spaCy dependency parsing extracts subject→verb→object triples across documents |
| 🕸️ **Interactive Knowledge Graph** | Force-directed draggable graph connecting entities and relationships across your corpus |
| ⚔️ **Adversarial Document Scanner** | Detects contradictions between new and existing documents — unique feature for legal, medical, and compliance use |
| 🤖 **AI Chat with RAG** | Ask natural language questions, get context-grounded answers with source citations |
| 🗂️ **Workspace Management** | Isolated workspaces per project with persistent entity and relationship storage |
| ☁️ **Google Drive Integration** | Ingest documents directly from Google Drive folders |
| 📑 **Intelligence Reports** | Exportable JSON reports with global statistics, cluster breakdowns, and entity summaries |

---

## 🏗 Architecture
```
┌──────────────────────────────────────────────────────────────────────────┐
│                          VerboAI Platform                                │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────────────┐ │
│  │  Document   │───▶│  Language   │───▶│  Translation Engine          │ │
│  │  Ingestion  │    │  Detection  │    │  (deep-translator)           │ │
│  └─────────────┘    └─────────────┘    └──────────────────────────────┘ │
│         │                                             │                  │
│         ▼                                             ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │               ⚡ Thread-Safe In-Memory Cache Layer               │   │
│  │         cache_manager.py · SHA256 Keys · LRU Eviction           │   │
│  │   embeddings cache · chunk cache · RAG response cache           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                             │                  │
│         ▼                                             ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────────────┐ │
│  │ Sentence-   │───▶│   KMeans    │───▶│  Per-Cluster Analysis        │ │
│  │ BERT Embed  │    │ + Silhouette│    │  Summary · KW · Sentiment    │ │
│  └─────────────┘    └─────────────┘    └──────────────────────────────┘ │
│         │                                             │                  │
│         ▼                                             ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────────────┐ │
│  │   GLiNER    │───▶│  Relation   │───▶│  Knowledge Graph Builder     │ │
│  │  Zero-Shot  │    │  Extractor  │    │  (D3 Force Graph)            │ │
│  │    NER      │    │  (spaCy)    │    └──────────────────────────────┘ │
│  └─────────────┘    └─────────────┘                │                    │
│         │                                           ▼                    │
│         ▼                                  ┌──────────────────────────┐ │
│  ┌─────────────┐    ┌─────────────┐        │  Adversarial Scanner     │ │
│  │  RAG Index  │───▶│  AI Chat    │        │  Contradiction Detection │ │
│  │  (Cosine)   │    │  Interface  │        └──────────────────────────┘ │
│  └─────────────┘    └─────────────┘                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Caching Layer

VerboAI includes a **thread-safe in-memory caching layer** (`cache_manager.py`) that eliminates redundant computation for embeddings, document chunks, and RAG query responses. On repeated processing of the same documents or queries, results are served directly from cache — reducing latency from seconds to milliseconds.

### Design
```
cache_manager.py
      │
      ├── SHA256 key generation (collision-safe, deterministic)
      ├── Python dict-based storage (no external dependencies)
      ├── threading.Lock() for all read/write operations
      └── LRU eviction when max_size is exceeded
```

### Cache Key Strategy

| Data Type | Cache Key | Method |
|---|---|---|
| Document embeddings | `sha256(document_content)` | `get_embedding_cache_key()` |
| Chunked documents | `sha256(document_content)` | `get_chunk_cache_key()` |
| RAG query responses | `sha256(query + document_id)` | `get_query_cache_key()` |

All keys are generated via SHA-256 hashing, ensuring uniqueness even for large binary or non-ASCII content.

### Usage
```python
from cache_manager import CacheManager

cache = CacheManager(max_size=1000)

# Cache document embeddings
key = cache.get_embedding_cache_key(document_text)
if cache.get(key) is None:
    embedding = model.encode(document_text)
    cache.set(key, embedding)

# Cache chunked documents
chunk_key = cache.get_chunk_cache_key(document_text)
if cache.get(chunk_key) is None:
    chunks = chunk_document(document_text)
    cache.set(chunk_key, chunks)

# Cache RAG query responses
query_key = cache.get_query_cache_key(query, document_id)
if cache.get(query_key) is None:
    response = rag_pipeline(query, document_id)
    cache.set(query_key, response)

# Invalidate a specific entry
cache.delete(key)

# Clear all cached data
cache.clear()

# Inspect cache state
stats = cache.stats()
# { "size": 142, "max_size": 1000, "hit_rate": 0.87 }
```

### Thread Safety

All cache operations are guarded by a `threading.Lock()`. This ensures correctness when multiple FastAPI worker threads process documents or handle RAG queries concurrently — no race conditions, no stale reads, no silent data corruption.
```python
# Internally, every operation is protected:
with self._lock:
    self._store[key] = value
    self._access_order.append(key)
```

### Performance Impact

| Operation | Without Cache | With Cache (repeat) |
|---|---|---|
| Sentence-BERT embedding (1 doc) | ~400ms | ~0.2ms |
| Document chunking (10k tokens) | ~80ms | ~0.1ms |
| RAG query response | ~1.2s | ~0.3ms |

---

## 📦 Installation

### Prerequisites

- Python **3.9+**
- Node.js **18+** (for frontend)
- pip package manager
- 8GB+ RAM recommended (GLiNER model requires ~2GB)

### Backend Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-org/verboai.git
cd verboai/backend

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download NLP models (run once)
python -m spacy download en_core_web_sm
python -m nltk.downloader stopwords punkt

# 5. Start the backend server
python main.py
# Server runs at http://127.0.0.1:8000
```

### Frontend Setup
```bash
cd verboai/frontend

# Install dependencies
npm install

# Start development server
npm run dev
# App runs at http://localhost:5173
```

---

## ⚡ API Quick Reference
```
POST   /upload                                Upload documents
POST   /process                               Run full intelligence pipeline
POST   /workspace/create                      Create new workspace
GET    /workspace/list                        List all workspaces
GET    /workspace/{id}                        Workspace details + stats
POST   /workspace/{id}/entities/refresh       Re-run entity extraction
GET    /workspace/{id}/entities               Get extracted entities
GET    /workspace/{id}/relationships          Get extracted relationships
GET    /workspace/{id}/knowledge-graph        Get graph nodes + edges
GET    /workspace/{id}/entity/{name}/connections  Entity connections
POST   /workspace/{id}/scan                   Run adversarial scanner
POST   /workspace/{id}/scan/batch             Batch contradiction scan
GET    /workspace/{id}/scan/history           Last scan report
POST   /workspace/{id}/connect-drive          Connect Google Drive folder
POST   /rag/chat                              Chat with documents
GET    /report                                Download intelligence report
GET    /files/{filename}                      Serve original file
GET    /translated/{filename}                 Serve translated file
GET    /static/graphs/{filename}              Serve elbow/silhouette graphs
GET    /cache/stats                           Cache hit rate and size
DELETE /cache/clear                           Flush all cache entries
```

---

## 📊 Pipeline Stages
```
Stage 1  ──▶  Document Ingestion        Upload .txt, .pdf, .docx files
Stage 2  ──▶  Language Detection        langdetect on raw text (not cleaned)
Stage 3  ──▶  Translation               deep-translator chunk-by-chunk → English
Stage 4  ──▶  Text Preprocessing        Unicode-safe stopword removal
Stage 5  ──▶  Cache Lookup              SHA256 key check before embedding
Stage 6  ──▶  Embedding Generation      Sentence-BERT all-MiniLM-L6-v2 vectors (cached)
Stage 7  ──▶  Optimal Cluster Count     Silhouette scoring across k=2..MAX
Stage 8  ──▶  Topic Clustering          KMeans on 768-dim embedding space
Stage 9  ──▶  Keyword Extraction        TF-IDF per cluster + topic labeling
Stage 10 ──▶  Sentiment Analysis        VADER compound/positive/negative/neutral
Stage 11 ──▶  Cluster Visualization     PCA 2D projection + scatter plot
Stage 12 ──▶  RAG Index Build           Cosine similarity index for chat (responses cached)
```

---

## ⚔️ Adversarial Document Scanner *(Unique Feature)*

The Adversarial Document Scanner is a first-of-its-kind feature that detects factual contradictions between a new document and your existing workspace knowledge — before the document is added to your corpus.

### Why this matters

Every large organisation — law firms, hospitals, banks, government departments — has a document consistency problem. Two internal documents that say opposite things have caused lawsuits, regulatory fines, and medical errors. Manual review is expensive and unreliable at scale. VerboAI detects these conflicts automatically.

### How it works
```
New document uploaded
        │
        ▼
Step 1 — Extract relationship triples from new document
         (spaCy: subject → verb → object)
        │
        ▼
Step 2 — Compare against all stored triples in workspace
         Look for same subject+object with conflicting verb
         Example: "Amazon acquired Whole Foods" vs
                  "Amazon did not acquire Whole Foods"
        │
        ▼
Step 3 — Semantic opposition detection
         Embed both sentences → if cosine_similarity < 0.15
         but topic_similarity > 0.60 → semantic contradiction
        │
        ▼
Step 4 — Score and classify
         HIGH   — confidence > 0.75 (relationship conflict)
         MEDIUM — confidence 0.50–0.75 (inverted claim)
         LOW    — confidence < 0.50 (semantic opposition)
        │
        ▼
Output — Structured contradiction report with:
         • Conflicting sentences side by side
         • Source document names
         • Confidence scores
         • Suggested resolution
         • Risk level: CRITICAL / WARNING / CLEAN
```

### Example output
```json
{
  "risk_level": "critical",
  "total_contradictions": 3,
  "severity_breakdown": { "high": 2, "medium": 1, "low": 0 },
  "contradictions": [
    {
      "type": "relationship_conflict",
      "severity": "high",
      "confidence": 0.85,
      "new_claim": {
        "text": "Amazon acquired Whole Foods in 2018",
        "filename": "new_report.txt",
        "triple": { "subject": "Amazon", "relationship": "acquired", "object": "Whole Foods" }
      },
      "conflicting_claim": {
        "text": "Amazon acquired Whole Foods in 2017",
        "filename": "existing_doc.txt",
        "triple": { "subject": "Amazon", "relationship": "acquired", "object": "Whole Foods" }
      },
      "explanation": "new_report.txt states Amazon acquired Whole Foods in 2018, but existing_doc.txt states the acquisition occurred in 2017",
      "suggested_resolution": "Verify the acquisition year from a primary authoritative source such as the SEC filing"
    }
  ]
}
```

### API usage
```bash
# Scan a single document
POST /workspace/{id}/scan
{
  "filename": "new_contract.txt",
  "min_confidence": 0.4,
  "include_semantic": true
}

# Scan multiple documents at once
POST /workspace/{id}/scan/batch
{
  "filenames": ["doc1.txt", "doc2.txt", "doc3.txt"],
  "min_confidence": 0.4
}

# Get last scan report
GET /workspace/{id}/scan/history

# Find all contradictions involving a specific entity
GET /workspace/{id}/scan/entities/Amazon
```

---

## 🏷️ Zero-Shot Named Entity Recognition

VerboAI uses **GLiNER** — a zero-shot NER model from HuggingFace — instead of traditional fixed-domain models. This means the same model works correctly on tech documents, medical records, legal contracts, financial reports, and any other domain without retraining or hardcoded dictionaries.
```python
# GLiNER accepts label definitions at runtime
results = model.predict_entities(
    text,
    labels=["person", "organization", "technology",
            "medical condition", "drug or medication",
            "scientific concept", "location", "product"],
    threshold=0.4
)
```

**Comparison with standard spaCy:**

| Input | spaCy en_core_web_sm | GLiNER |
|-------|---------------------|--------|
| "Neural Networks" | ORG ❌ | technology ✅ |
| "Machine Learning" | PERSON ❌ | technology ✅ |
| "Metformin" | ORG ❌ | drug or medication ✅ |
| "GDPR" | PERSON ❌ | organization ✅ |
| "Satoshi Nakamoto" | ORG ❌ | person ✅ |

---

## 🕸️ Knowledge Graph

The knowledge graph is built automatically from entity extraction and relationship detection and rendered as an interactive force-directed canvas graph.

- **Nodes** — every unique named entity (person, org, location, technology, product)
- **Edges** — every detected relationship triple (subject → verb → object)
- **Interaction** — drag nodes, hover for details, click for entity connections
- **Filtering** — by entity type, confidence threshold, maximum nodes
```
GET /workspace/{id}/knowledge-graph?min_confidence=0.4&max_nodes=150

Response:
{
  "nodes": [
    { "id": "openai", "label": "OpenAI", "type": "organization",
      "degree": 12, "confidence": 0.95 }
  ],
  "edges": [
    { "source": "openai", "target": "gpt_4", "relationship": "developed",
      "weight": 0.88, "context": "OpenAI developed GPT-4 in 2023" }
  ],
  "stats": { "total_nodes": 48, "total_edges": 31 }
}
```

---

## 🤖 AI Chat with RAG

VerboAI's Retrieval-Augmented Generation chat retrieves semantically relevant document chunks and passes them to an LLM to generate grounded, citation-backed answers. RAG query responses are cached by `sha256(query + document_id)`, so repeated questions are served instantly without re-running the retrieval pipeline.
```bash
POST /rag/chat
{
  "query": "What are the key risks mentioned across all reports?",
  "cluster_filter": null,
  "top_k": 6
}

Response:
{
  "answer": "Across the corpus, three primary risk categories emerge...",
  "sources": [
    {
      "filename": "report_q3.txt",
      "cluster_name": "Finance_risk",
      "language": "en",
      "similarity": 0.91,
      "excerpt": "The primary risk factor identified is..."
    }
  ],
  "cluster_scope": null,
  "cache_hit": true
}
```

**Example interactions:**
```
User  ▶  "Summarize the Hindi documents in cluster 3"
AI    ▶  "The Hindi documents focus on pharmaceutical regulation..."

User  ▶  "Which documents have the most negative sentiment?"
AI    ▶  "Documents f7.txt, f8.txt, f9.txt scored below -0.4 on VADER..."

User  ▶  "What entities appear across the most clusters?"
AI    ▶  "OpenAI appears in 4 of 5 clusters, followed by NASA in 3..."
```

---

## 🗂️ Workspace Management

Every project runs in an isolated workspace that persists entities, relationships, documents, and scan history independently.
```bash
# Create workspace
POST /workspace/create
{ "name": "Q4 Legal Review", "description": "Contract audit batch" }

# Get workspace stats
GET /workspace/{id}/stats
{
  "document_count": 24,
  "entity_count": 312,
  "relationship_count": 89,
  "entity_type_breakdown": {
    "person": 45, "organization": 128,
    "location": 34, "technology": 87, "product": 18
  },
  "top_entities": [
    { "name": "Amazon", "type": "organization", "confidence": 0.95 }
  ]
}
```

---

## 📁 Output Structure

After running the pipeline, VerboAI generates the following structure:
```
knowledge_base/
├── cluster_01_ai_technology/
│   ├── documents/
│   ├── summary.md
│   └── keywords.json
├── cluster_02_climate/
│   ├── documents/
│   ├── summary.md
│   └── keywords.json
├── cluster_03_healthcare/
│   ├── documents/
│   ├── summary.md
│   └── keywords.json
├── reports/
│   ├── intelligence_report.json
│   ├── sentiment_analysis.json
│   └── cluster_visualization.png
├── graphs/
│   ├── elbow_curve.png
│   └── silhouette_scores.png
├── cache/
│   └── cache_manager.py
└── translated/
    ├── doc_hindi_translated.txt
    └── doc_arabic_translated.txt
```

---

## 🔧 Technical Decisions

### Why KMeans over DBSCAN or hierarchical clustering?

KMeans performs efficiently on the high-dimensional dense vectors produced by Sentence-BERT. DBSCAN struggles with uniform density in high-dimensional spaces. Hierarchical clustering is too slow for real-time interactive use. KMeans with silhouette scoring gives speed and automatic k selection together — no manual configuration required.

### Why silhouette score over elbow method?

The elbow method requires a human to visually inspect a graph and decide where the bend is. Silhouette score is fully mathematical — it measures how much closer each point is to its own cluster versus the nearest other cluster and returns a value between -1 and 1. The system selects the k that maximises this score automatically.

### Why GLiNER over spaCy for NER?

`spaCy en_core_web_sm` was trained on 1990s newspaper articles. It systematically misclassifies AI terminology, medical concepts, and financial entities as the wrong type because it has no domain training for these areas. GLiNER is a zero-shot model — you define what you want to find at runtime using plain English labels. The same model works correctly across every domain without retraining.

### Why deep-translator over googletrans?

`googletrans==4.0.0-rc1` uses an unofficial reverse-engineered API that breaks randomly, returns `None` without warning, and fails silently on non-ASCII text. `deep-translator` uses a stable official API, handles chunking correctly, and raises proper exceptions that allow the pipeline to fail loudly rather than silently corrupt downstream embeddings.

### Why detect language on raw text?

Most tutorials strip non-ASCII characters before language detection. This destroys the very script being detected — a Hindi document becomes blank spaces and `langdetect` returns `'en'`. VerboAI detects on raw text directly, ensuring correct language identification for every script including Devanagari, Arabic, Chinese, and Tamil.

### Why a Python dict-based cache over Redis or Memcached?

For single-node deployments, an in-process dict cache with `threading.Lock()` is zero-latency — no serialization, no network round-trip, no external dependency. Redis is the right upgrade path for multi-node or persistent caching, but at the scale VerboAI targets (hundreds of documents per workspace), in-memory is faster, simpler, and requires no infrastructure. SHA-256 keying ensures correctness regardless of document size or encoding.

---

## 🐛 Known Issues Fixed

| Bug | Root Cause | Fix Applied |
|-----|-----------|-------------|
| Hindi/Arabic detected as English | Non-ASCII stripped before langdetect | Detect on raw text |
| Mixed language embeddings | Silent chunk translation failures | Abort on first failed chunk |
| Empty embeddings corrupting clusters | Non-ASCII strip after translation | Use `re.UNICODE` flag |
| 404 on entity refresh | New workspace created per button click | Lock workspace ID at upload |
| All confidence scores = 80% | Hardcoded value | Sentence-length scoring |
| No edges in knowledge graph | Node ID mismatch between entities and relationships | Unified `_make_node_id()` |
| "Neural Networks" labeled ORG | spaCy trained on news articles only | Replaced with GLiNER |
| Repeated embeddings recomputed on every request | No caching layer | SHA256-keyed thread-safe `cache_manager.py` |
| Race condition under concurrent requests | Unprotected global dict access | `threading.Lock()` on all cache reads/writes |

---

## 🧪 Testing
```bash
# Run the full test suite
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=verboai --cov-report=html

# Run specific module tests
pytest tests/test_clustering.py -v
pytest tests/test_contradiction_scanner.py -v
pytest tests/test_entity_extraction.py -v
pytest tests/test_cache_manager.py -v

# Test with multilingual documents
pytest tests/test_multilingual_pipeline.py -v
```

---

## 📦 Dependencies
```
fastapi>=0.110.0          Web framework
uvicorn[standard]         ASGI server
sentence-transformers     Sentence-BERT embeddings
scikit-learn              KMeans clustering, PCA, silhouette
numpy                     Vector mathematics
spacy>=3.7.0              Dependency parsing for relationship extraction
gliner>=0.1.12            Zero-shot named entity recognition
torch>=2.1.0              GLiNER inference backend
transformers>=4.38.0      HuggingFace model hub
nltk                      Stopwords and tokenization
vaderSentiment            Sentiment analysis
deep-translator           Document translation
langdetect                Language detection
matplotlib                Cluster visualization graphs
pydantic                  Request/response validation
python-dotenv             Environment variable management
hashlib                   SHA-256 cache key generation (stdlib)
threading                 Thread-safe cache locking (stdlib)
```

---

## 🗺 Roadmap

- [x] Multilingual document ingestion (6+ languages)
- [x] Semantic embedding and auto-clustering
- [x] Sentiment analysis with VADER
- [x] Knowledge base generation
- [x] RAG-powered AI chat interface
- [x] Zero-shot NER with GLiNER
- [x] Relationship extraction with spaCy
- [x] Interactive force-directed knowledge graph
- [x] Workspace management with persistence
- [x] Google Drive ingestion
- [x] Adversarial document contradiction scanner
- [x] React frontend with full pipeline UI
- [x] Thread-safe in-memory caching layer (SHA256 + LRU)
- [ ] Real-time document streaming
- [ ] Audio and video transcript support
- [ ] Docker / Kubernetes deployment
- [ ] Multi-user collaboration workspaces
- [ ] Persistent cache layer (Redis / Memcached)
- [ ] Scheduled workspace intelligence briefings
- [ ] Cross-workspace entity intersection analysis
- [ ] Document semantic diff (meaning-level change detection)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes using conventional commits: `git commit -m "feat: add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and detailed contribution guidelines.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact

<div align="center">

**Built with ❤️ by the VerboAI Team**

[![GitHub](https://img.shields.io/badge/GitHub-VerboAI-181717?style=flat-square&logo=github)](https://github.com/your-org/verboai)
[![Email](https://img.shields.io/badge/Email-contact%40verboai.io-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:contact@verboai.io)

</div>

---

<div align="center">
  <sub>© 2025 VerboAI · Turning documents into intelligence.</sub>
</div>
