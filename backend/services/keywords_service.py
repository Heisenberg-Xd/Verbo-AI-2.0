import re
from sklearn.feature_extraction.text import TfidfVectorizer
from config.settings import LABEL_STOPWORDS

def _is_ascii_word(w: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9]+$', w))

def get_top_keywords(cluster_texts: list[str], top_n: int = 10) -> list[str]:
    if not cluster_texts or all(t.strip() == '' for t in cluster_texts):
        return []
    vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
    try:
        X        = vectorizer.fit_transform(cluster_texts)
        features = vectorizer.get_feature_names_out()
        summed   = X.toarray().sum(axis=0)
        results  = []
        for i in summed.argsort()[::-1]:
            word = features[i]
            if (word.lower() not in LABEL_STOPWORDS
                    and _is_ascii_word(word)
                    and len(word) > 2):
                results.append(word)
            if len(results) >= top_n:
                break
        return results
    except Exception:
        return []

import os
import requests

def get_cluster_topic(keywords: list[str], context_text: str = "") -> str:
    # Use only proper alpha words (no digits, no short tokens)
    clean = [k for k in keywords if k.isalpha() and k.lower() not in LABEL_STOPWORDS]
    
    # ── Robust Heuristic Fallback (Sensible even without AI) ──────────
    fallback = "Miscellaneous Cluster"
    if len(clean) >= 3:
        fallback = f"{clean[0].capitalize()} & {clean[1].capitalize()} {clean[2].capitalize()} Analysis"
    elif len(clean) >= 2:
        fallback = f"{clean[0].capitalize()} & {clean[1].capitalize()} Trends"
    elif clean:
        fallback = f"{clean[0].capitalize()} Insights"

    api_key = os.getenv("GEMINI_API_KEY", "").strip('"').strip("'")
    if not api_key:
        return fallback

    # Mirroring models from successful rag_extension.py
    # We include 1.5-flash first as it's often more available on free tier
    models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
    
    prompt = (
        f"You are a professional research analyst. \n"
        f"Based on these keywords and summary, create a short (2-4 words) Title Case thematic name for this document cluster.\n\n"
        f"KEYWORDS: {', '.join(clean[:15])}\n"
        f"SUMMARY_CONTEXT: {context_text[:1000]}\n\n"
        f"Rules:\n"
        f"- Natural language titles only (e.g. 'Global Economic Trends').\n"
        f"- No punctuation, no quotes, no underscores.\n"
        f"- Return ONLY the title.\n\n"
        f"Title:"
    )

    for _model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 20, "temperature": 0.4}
        }
        try:
            # Using timeout to ensure we don't hang the pipeline
            r = requests.post(url, json=payload, timeout=6)
            if r.status_code == 200:
                ans = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                clean_ans = ans.strip().strip('"').strip("'").strip()
                # Final safety check on the AI response
                if clean_ans and len(clean_ans) > 3 and " " in clean_ans:
                    return clean_ans
        except Exception:
            continue

    return fallback
