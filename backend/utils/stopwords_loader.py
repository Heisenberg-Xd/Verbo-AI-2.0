import os

def load_stopwords(path: str) -> set:
    if not os.path.exists(path):
        return set()
    with open(path, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f)

def get_all_stopwords(path: str) -> set:
    return load_stopwords(path)
