import os
import shutil
import json
from config.settings import KNOWLEDGE_BASE_DIR, UPLOAD_FOLDER, TRANSLATED_FOLDER

def organize_knowledge_base(
    cluster_name, file_names, translated_files,
    summary, sentiment, lang_distribution, keywords, cluster_id
):
    cluster_dir      = os.path.join(KNOWLEDGE_BASE_DIR, cluster_name)
    originals_dir    = os.path.join(cluster_dir, "originals")
    translations_dir = os.path.join(cluster_dir, "translations")
    os.makedirs(originals_dir,    exist_ok=True)
    os.makedirs(translations_dir, exist_ok=True)

    for fname in file_names:
        src = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(originals_dir, fname))
        trans_name = translated_files.get(fname)
        if trans_name:
            src_t = os.path.join(TRANSLATED_FOLDER, trans_name)
            if os.path.exists(src_t):
                shutil.copy2(src_t, os.path.join(translations_dir, trans_name))

    with open(os.path.join(cluster_dir, "summary.txt"),   "w", encoding="utf-8") as f:
        f.write(summary)
    with open(os.path.join(cluster_dir, "sentiment.json"), "w", encoding="utf-8") as f:
        json.dump(sentiment, f, indent=2)
    with open(os.path.join(cluster_dir, "metadata.json"),  "w", encoding="utf-8") as f:
        json.dump({
            "cluster_id": cluster_id, "cluster_name": cluster_name,
            "summary": summary, "sentiment": sentiment,
            "language_distribution": lang_distribution,
            "keywords": keywords, "document_count": len(file_names), "files": file_names
        }, f, indent=2)
