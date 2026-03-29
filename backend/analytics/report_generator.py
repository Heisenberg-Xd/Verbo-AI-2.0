import os
import json
from config.settings import REPORTS_DIR

def generate_intelligence_report(file_names, lang_per_file, cluster_insights) -> dict:
    lang_counter: dict = {}
    for lang in lang_per_file.values():
        lang_counter[lang] = lang_counter.get(lang, 0) + 1

    report = {
        "global_statistics":   {"total_documents": len(file_names),
                                 "total_clusters":  len(cluster_insights),
                                 "language_breakdown": lang_counter},
        "cluster_breakdown":   cluster_insights,
        "sentiment_analytics": {c["cluster_name"]: c["sentiment"] for c in cluster_insights},
        "language_analytics":  {c["cluster_name"]: c["language_distribution"] for c in cluster_insights},
    }
    report_path = os.path.join(REPORTS_DIR, "intelligence_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report
