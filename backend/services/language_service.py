import re
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0  # make detection deterministic

def detect_language(text: str) -> str:
    try:
        return detect(text[:800])  # never strip non-ASCII before detecting
    except Exception:
        return 'unknown'