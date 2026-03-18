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
[![NLP](https://img.shields.io/badge/NLP-Sentence--BERT-FF6B6B?style=flat-square&logo=huggingface&logoColor=white)](https://sbert.net)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)
[![RAG](https://img.shields.io/badge/AI-RAG%20Enabled-8B5CF6?style=flat-square&logo=openai&logoColor=white)](https://github.com)
[![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)](https://github.com)

<br/>

> *Transform unstructured multilingual documents into structured knowledge — with interactive AI chat built in.*

<br/>

</div>

---

## 🚀 Overview

**VerboAI** is an advanced AI-powered intelligence platform designed to analyze large collections of multilingual documents and convert them into structured knowledge and actionable insights.

The system leverages modern **Natural Language Processing** and **Machine Learning** techniques to automatically detect languages, translate documents, generate semantic embeddings, cluster topics, extract keywords, perform sentiment analysis, and organize information into a fully searchable knowledge base.

With integrated **AI Chat (RAG)** capabilities, users can interactively query their documents and receive accurate, context-grounded answers — all from a single unified platform.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🌍 **Multilingual Intelligence** | Automatically detects document languages and translates them into English for unified analysis |
| 📂 **Document Processing Pipeline** | Upload multiple documents and run them through a full AI intelligence workflow |
| 🧠 **Semantic Understanding** | Uses **Sentence-BERT** embeddings for deep semantic representation |
| 🧩 **Topic Clustering** | Groups documents into coherent clusters using **KMeans** clustering |
| 📝 **Automatic Summaries** | Generates concise, readable summaries for each document cluster |
| 🔑 **Keyword Extraction** | Extracts top keywords from documents using **TF-IDF** |
| 😊 **Sentiment Analytics** | Analyzes document tone and sentiment using **VADER** |
| 📊 **Cluster Visualization** | Visualizes document clusters using **PCA** dimensionality reduction |
| 🗂 **Knowledge Base Generation** | Automatically organizes documents into structured, topic-based folders |
| 📑 **Intelligence Reports** | Generates detailed reports containing insights, statistics, and analytics |
| 🤖 **AI Chat with RAG** | Ask natural language questions and receive contextual AI-grounded answers |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VerboAI Platform                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Document   │───▶│  Language    │───▶│  Translation │  │
│  │   Ingestion  │    │  Detection   │    │   Engine     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│          │                                       │          │
│          ▼                                       ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Sentence-BERT│───▶│   KMeans     │───▶│  Knowledge   │  │
│  │  Embeddings  │    │  Clustering  │    │    Base      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│          │                                       │          │
│          ▼                                       ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   TF-IDF     │    │    VADER     │    │   RAG Chat   │  │
│  │   Keywords   │    │  Sentiment   │    │   Interface  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

- Python **3.9+**
- pip or conda package manager
- 4GB+ RAM recommended for large document collections

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/verboai.git
cd verboai

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download language models
python scripts/download_models.py
```

---

## ⚡ Quick Start

```python
from verboai import VerboAI

# Initialize the platform
platform = VerboAI(output_dir="./knowledge_base")

# Upload and process documents
platform.ingest_documents("./my_documents/")

# Run the full intelligence pipeline
results = platform.run_pipeline(
    translate=True,
    cluster=True,
    sentiment=True,
    generate_report=True
)

# Start the AI chat interface
platform.chat("What are the main themes across the documents?")
```

---

## 🔧 Configuration

Create a `config.yaml` file in the project root to customize the pipeline:

```yaml
pipeline:
  embedding_model: "all-MiniLM-L6-v2"   # Sentence-BERT model
  num_clusters: 8                         # KMeans cluster count
  max_keywords: 15                        # TF-IDF keyword limit
  translation_target: "en"               # Target translation language

rag:
  model: "gpt-4o-mini"                   # LLM for chat
  top_k_documents: 5                     # Documents retrieved per query
  temperature: 0.3

output:
  save_reports: true
  report_format: "pdf"                   # pdf | html | markdown
  visualize_clusters: true
```

---

## 📊 Pipeline Stages

```
Stage 1 ──▶  Document Ingestion      Upload PDFs, DOCX, TXT, HTML
Stage 2 ──▶  Language Detection      Identify source languages
Stage 3 ──▶  Translation             Normalize to English via NMT
Stage 4 ──▶  Embedding Generation    Sentence-BERT semantic vectors
Stage 5 ──▶  Topic Clustering        KMeans group discovery
Stage 6 ──▶  Keyword Extraction      TF-IDF per cluster
Stage 7 ──▶  Sentiment Analysis      VADER tone classification
Stage 8 ──▶  Cluster Visualization   PCA 2D/3D projection
Stage 9 ──▶  Knowledge Base Build    Structured folder output
Stage 10 ─▶  Report Generation       Full analytics export
Stage 11 ─▶  RAG Chat Interface      Interactive document Q&A
```

---

## 🤖 AI Chat (RAG)

VerboAI's Retrieval-Augmented Generation chat lets you ask questions directly about your documents:

```python
# After running the pipeline
chat = platform.get_chat_interface()

response = chat.ask("What are the key risks mentioned across all reports?")
print(response.answer)
print(response.source_documents)   # Shows which documents were referenced
```

**Example interactions:**

```
User  ▶  "Summarize the French-language documents in cluster 3"
AI    ▶  "Cluster 3 contains 12 documents primarily focused on..."

User  ▶  "Which documents have the most negative sentiment?"
AI    ▶  "The following 4 documents scored below -0.5 on VADER..."

User  ▶  "What keywords appear most frequently across all clusters?"
AI    ▶  "The top 10 cross-cluster keywords are: policy, regulation..."
```

---

## 📁 Output Structure

After running the pipeline, VerboAI generates the following structure:

```
knowledge_base/
├── cluster_01_policy/
│   ├── documents/
│   ├── summary.md
│   └── keywords.json
├── cluster_02_finance/
│   ├── documents/
│   ├── summary.md
│   └── keywords.json
├── reports/
│   ├── intelligence_report.pdf
│   ├── sentiment_analysis.json
│   └── cluster_visualization.html
└── metadata/
    ├── embeddings.npy
    └── pipeline_log.json
```

---

## 🧪 Running Tests

```bash
# Run the full test suite
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=verboai --cov-report=html

# Run a specific test module
pytest tests/test_clustering.py -v
```

---

## 🗺 Roadmap

- [x] Multilingual document ingestion
- [x] Semantic embedding & clustering
- [x] Sentiment analysis
- [x] Knowledge base generation
- [x] RAG-powered chat interface
- [ ] Web UI dashboard
- [ ] Real-time document streaming
- [ ] Support for audio/video transcripts
- [ ] API REST endpoints
- [ ] Docker / Kubernetes deployment

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m "feat: add your feature"`
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
