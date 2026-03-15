import re
from utils.stopwords_loader import get_all_stopwords
from config.settings import STOPWORDS_PATH

english_stopwords = get_all_stopwords(STOPWORDS_PATH)

def preprocess_text(text: str) -> str:
    # Do NOT strip non-ASCII — translation may have left valid Unicode letters
    text = re.sub(r'[^\w\s]', ' ', text, flags=re.UNICODE)  # punctuation only
    text = re.sub(r'\b\d+\b', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    words = text.split()
    filtered = [
        w for w in words
        if w.lower() not in english_stopwords
        and len(w) > 1
    ]

    result = ' '.join(filtered)
    # Guard: if filtering wiped everything (e.g. all stopwords), fall back to cleaned text
    return result if result.strip() else text.strip()