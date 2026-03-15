import nltk
from nltk.tokenize import sent_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from config.settings import NON_ASCII_THRESHOLD

# ─────────────────────────────────────────────
# NLTK Downloads
# ─────────────────────────────────────────────
nltk.download('punkt',     quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)

def _is_english_sentence(s: str) -> bool:
    if not s.strip() or len(s.split()) < 4:
        return False
    non_ascii = sum(1 for c in s if ord(c) > 127)
    return (non_ascii / max(len(s), 1)) < NON_ASCII_THRESHOLD

def generate_summary(texts: list[str], max_sentences: int = 3) -> str:
    combined  = ' '.join(texts)
    sentences = sent_tokenize(combined)

    en_sentences = [s.strip() for s in sentences if _is_english_sentence(s)]

    if not en_sentences:
        return ' '.join(sentences[:max_sentences])   # fallback: whatever we have

    if len(en_sentences) <= max_sentences:
        return ' '.join(en_sentences)

    try:
        vectorizer   = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(en_sentences)
        sim_matrix   = cosine_similarity(tfidf_matrix)
        scores       = sim_matrix.sum(axis=1)
        ranked_idx   = sorted(scores.argsort()[::-1][:max_sentences])
        return ' '.join([en_sentences[i] for i in ranked_idx])
    except Exception:
        return ' '.join(en_sentences[:max_sentences])
