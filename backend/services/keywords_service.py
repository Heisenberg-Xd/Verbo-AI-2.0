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

def get_cluster_topic(keywords: list[str]) -> str:
    # Use only proper alpha words (no digits, no short tokens)
    clean = [k for k in keywords if k.isalpha() and k.lower() not in LABEL_STOPWORDS]
    if len(clean) >= 2:
        return f"{clean[0]}_{clean[1]}"
    if clean:
        return clean[0]
    return "cluster"
