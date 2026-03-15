"""
services/entity_extractor.py

Uses GLiNER for zero-shot NER — works across any domain (tech, health,
finance, legal, etc.) without hardcoded dictionaries or retraining.
Falls back to spaCy en_core_web_sm if GLiNER is unavailable.
"""

import re
from typing import List, Dict, Any

# ── Model singletons ──────────────────────────────────────────────────────────
_gliner_model = None
_spacy_model  = None


def _load_gliner():
    global _gliner_model
    if _gliner_model is not None:
        return _gliner_model
    try:
        from gliner import GLiNER
        _gliner_model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
    except Exception:
        _gliner_model = None
    return _gliner_model


def _load_spacy():
    global _spacy_model
    if _spacy_model is not None:
        return _spacy_model
    try:
        import spacy
        _spacy_model = spacy.load("en_core_web_sm")
    except Exception:
        _spacy_model = None
    return _spacy_model


# ── Entity labels passed to GLiNER at runtime ─────────────────────────────────
# These are natural language descriptions — GLiNER understands them semantically.
# This is what makes it domain-agnostic: the same labels work for tech, health,
# finance, legal docs, etc.
GLINER_LABELS = [
    "person",
    "organization",
    "location",
    "technology",           # programming languages, frameworks, platforms
    "medical condition",    # diseases, symptoms, syndromes
    "drug or medication",   # pharma, treatments
    "product",              # named software, hardware, AI models
    "scientific concept",   # algorithms, theories, methodologies
    "event",                # conferences, elections, incidents
]

# Map GLiNER's returned labels → our canonical 5 types
GLINER_TYPE_MAP = {
    "person":             "person",
    "organization":       "organization",
    "location":           "location",
    "technology":         "technology",
    "medical condition":  "product",       # surface as "product" in UI (named concept)
    "drug or medication": "product",
    "product":            "product",
    "scientific concept": "technology",    # algorithms etc. → technology bucket
    "event":              "location",      # events have a place/time context
}

# Noise filter — short tokens and pronouns that slip through any model
ENTITY_BLACKLIST = {
    "the", "a", "an", "this", "that", "these", "those",
    "it", "its", "they", "them", "he", "she", "we", "i", "you",
    "who", "which", "what", "how", "when", "where", "why",
    "go", "id", "us", "uk", "eu", "un", "api", "url",
}

MIN_ENTITY_LEN = 3

# spaCy label map (fallback path only)
SPACY_LABEL_MAP = {
    "PERSON":      "person",
    "ORG":         "organization",
    "GPE":         "location",
    "LOC":         "location",
    "FAC":         "location",
    "PRODUCT":     "product",
    "WORK_OF_ART": "product",
    "LANGUAGE":    "technology",
    "NORP":        "organization",
    "EVENT":       "location",
}

# Minimal tech seed for spaCy fallback only — unambiguous multi-word terms
TECH_KEYWORDS_FALLBACK = {
    "tensorflow", "pytorch", "keras", "docker", "kubernetes",
    "transformer", "bert", "fastapi", "django", "flask", "blockchain",
}


# ── Validation ────────────────────────────────────────────────────────────────
def _is_valid_entity(name: str) -> bool:
    stripped = name.strip()
    if len(stripped) < MIN_ENTITY_LEN:
        return False
    if stripped.lower() in ENTITY_BLACKLIST:
        return False
    if re.fullmatch(r'[\d\s\W]+', stripped):
        return False
    return True


# ── GLiNER extraction (primary) ───────────────────────────────────────────────
def _extract_with_gliner(text: str, filename: str) -> List[Dict[str, Any]]:
    model = _load_gliner()
    if not model:
        return []

    entities = []
    seen     = set()

    # GLiNER works best on chunks ≤ 512 tokens — split into paragraphs
    chunks = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    if not chunks:
        chunks = [text[:4000]]

    # Track name→count across chunks for confidence boosting
    name_counts: Dict[str, int] = {}

    for chunk in chunks:
        if not chunk:
            continue
        try:
            results = model.predict_entities(chunk, GLINER_LABELS, threshold=0.4)
        except Exception:
            continue

        for ent in results:
            name  = ent["text"].strip()
            label = ent["label"]
            score = ent.get("score", 0.7)

            name = re.sub(r"'s$", "", name).strip()
            name = re.sub(r'^(the|a|an)\s+', '', name, flags=re.I).strip()

            if not _is_valid_entity(name):
                continue

            name_lower = name.lower()
            name_counts[name_lower] = name_counts.get(name_lower, 0) + 1

            if name_lower in seen:
                continue
            seen.add(name_lower)

            entity_type = GLINER_TYPE_MAP.get(label, "organization")
            confidence  = round(min(0.97, score), 2)

            entities.append({
                "name":        name,
                "type":        entity_type,
                "source_file": filename,
                "confidence":  confidence,
                "_label":      label,   # keep original for dedup boosting
            })

    # Boost confidence for entities that appeared in multiple chunks
    for ent in entities:
        count = name_counts.get(ent["name"].lower(), 1)
        if count > 1:
            ent["confidence"] = round(min(0.97, ent["confidence"] + count * 0.02), 2)

    return entities


# ── spaCy extraction (fallback) ───────────────────────────────────────────────
def _extract_with_spacy(text: str, filename: str) -> List[Dict[str, Any]]:
    nlp = _load_spacy()
    if not nlp:
        return []

    doc      = nlp(text[:100_000])
    entities = []
    seen     = set()

    for ent in doc.ents:
        spacy_type = SPACY_LABEL_MAP.get(ent.label_)
        if not spacy_type:
            continue

        name = ent.text.strip()
        name = re.sub(r"'s$", "", name).strip()
        name = re.sub(r'^(the|a|an)\s+', '', name, flags=re.I).strip()

        if not _is_valid_entity(name):
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())

        count      = sum(1 for e in doc.ents if e.text.lower() == ent.text.lower())
        confidence = round(min(0.88, 0.65 + count * 0.03), 2)

        entities.append({
            "name":        name,
            "type":        spacy_type,
            "source_file": filename,
            "confidence":  confidence,
        })

    # Tech keyword overlay for fallback path
    text_lower = text.lower()
    for kw in TECH_KEYWORDS_FALLBACK:
        if re.search(rf'\b{re.escape(kw)}\b', text_lower) and kw not in seen:
            seen.add(kw)
            entities.append({
                "name":        kw,
                "type":        "technology",
                "source_file": filename,
                "confidence":  0.70,
            })

    return entities


# ── Public API ────────────────────────────────────────────────────────────────
def extract_entities_from_documents(
    document_texts: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Extract entities from {filename: text}.
    Uses GLiNER if available (zero-shot, domain-agnostic),
    falls back to spaCy en_core_web_sm.
    """
    all_entities: List[Dict[str, Any]] = []
    use_gliner = _load_gliner() is not None

    for filename, text in document_texts.items():
        if not text or not text.strip():
            continue
        ents = (
            _extract_with_gliner(text, filename)
            if use_gliner
            else _extract_with_spacy(text, filename)
        )
        all_entities.extend(ents)

    # Merge duplicates across files
    merged: Dict[str, Dict[str, Any]] = {}
    for ent in all_entities:
        # Key on name + type so the same word in different roles stays separate
        key = f"{ent['name'].lower()}::{ent['type']}"
        if key not in merged:
            merged[key] = {
                "name":         ent["name"],
                "type":         ent["type"],
                "source_files": [ent["source_file"]],
                "confidence":   ent["confidence"],
            }
        else:
            if ent["source_file"] not in merged[key]["source_files"]:
                merged[key]["source_files"].append(ent["source_file"])
            merged[key]["confidence"] = round(
                max(merged[key]["confidence"], ent["confidence"]), 2
            )

    result = [e for e in merged.values() if e["confidence"] >= 0.50]
    return sorted(result, key=lambda e: e["confidence"], reverse=True)


def get_entity_summary(entities: List[Dict[str, Any]]) -> Dict[str, int]:
    summary: Dict[str, int] = {}
    for ent in entities:
        t = ent.get("type", "unknown")
        summary[t] = summary.get(t, 0) + 1
    return summary