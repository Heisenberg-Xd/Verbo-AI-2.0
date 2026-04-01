"""
services/relationship_extractor.py
Detects subject → relationship → object triples from documents.
"""

import re
from typing import List, Dict, Any, Set

# ── spaCy singleton ─────────────────────────────────────────────────────────
# Load spaCy once at module level instead of inside every extraction call.
_spacy_nlp = None
_spacy_available: bool = None  # None = not yet checked


def _get_spacy():
    """Return the spaCy model, loading it once and caching globally."""
    global _spacy_nlp, _spacy_available
    if _spacy_available is not None and not _spacy_available:
        return None
    if _spacy_nlp is not None:
        return _spacy_nlp
    try:
        import spacy
        _spacy_nlp = spacy.load("en_core_web_sm")
        _spacy_available = True
    except Exception:
        _spacy_available = False
        _spacy_nlp = None
    return _spacy_nlp

RELATIONSHIP_VERBS = {
    "acquired", "acquires", "bought", "purchases", "invested", "invests",
    "funded", "funds", "backed", "backs",
    "developed", "develops", "created", "creates", "built", "builds",
    "launched", "launches", "released", "releases", "published", "publishes",
    "designed", "designs", "invented", "invents",
    "founded", "founds", "leads", "led", "manages",
    "hired", "hires", "employs", "appointed", "appoints",
    "partnered", "partners", "collaborated", "collaborates",
    "joined", "joins", "merged", "merges", "integrated", "integrates",
    "uses", "used", "adopted", "adopts", "deployed", "deploys",
    "implemented", "implements",
    "competed", "competes", "rivals", "replaced", "replaces",
    "owns", "owned", "operates", "operated", "provides", "offered",
}

VERB_CANONICAL = {
    "acquired": "acquired", "acquires": "acquired", "bought": "acquired", "purchases": "acquired",
    "invested": "invested_in", "invests": "invested_in",
    "funded": "funded", "funds": "funded", "backed": "backed",
    "developed": "developed", "develops": "developed",
    "created": "created", "creates": "created",
    "built": "built", "builds": "built",
    "launched": "launched", "launches": "launched",
    "released": "released", "releases": "released",
    "founded": "founded", "founds": "founded",
    "leads": "leads", "led": "leads",
    "partnered": "partnered_with", "partners": "partnered_with",
    "collaborated": "collaborated_with", "collaborates": "collaborated_with",
    "merged": "merged_with", "merges": "merged_with",
    "uses": "uses", "used": "uses",
    "deployed": "deployed", "deploys": "deployed",
    "implemented": "implemented", "implements": "implemented",
    "competes": "competes_with", "competed": "competes_with",
    "replaced": "replaced", "replaces": "replaced",
    "hired": "hired", "hires": "hired",
    "employs": "employs",
    "owns": "owns", "owned": "owns",
    "operates": "operates", "operated": "operates",
    "provides": "provides",
}

# Pronouns and stop subjects — always reject these as relationship subjects
SUBJECT_BLACKLIST = {
    "it", "its", "they", "them", "their", "this", "that", "these", "those",
    "he", "she", "we", "i", "you", "who", "which", "what", "one", "some",
    "many", "few", "all", "both", "each", "any",
}


def _get_entity_span(token, doc) -> str:
    """Get the full noun phrase for a token, filtering stop words only at edges."""
    for chunk in doc.noun_chunks:
        if token in chunk:
            # Strip leading determiners but keep the core noun phrase intact
            text = chunk.text
            text = re.sub(r'^(the|a|an|this|that|these|those)\s+', '', text, flags=re.I)
            return text.strip()
    return token.text.strip()


def _extract_with_spacy(
    text: str,
    entities: List[Dict[str, Any]],
    filename: str,
) -> List[Dict[str, Any]]:
    nlp = _get_spacy()  # ← uses singleton, no per-call load
    if not nlp:
        return []

    entity_names: Set[str] = {e["name"].lower() for e in entities}
    entity_lookup: Dict[str, str] = {e["name"].lower(): e["name"] for e in entities}

    relationships = []
    seen = set()
    doc = nlp(text[:80_000])

    for sent in doc.sents:
        for token in sent:
            lemma = token.lemma_.lower()
            surface = token.text.lower()
            if lemma not in RELATIONSHIP_VERBS and surface not in RELATIONSHIP_VERBS:
                continue

            subject_token = None
            object_token = None

            for child in token.children:
                if child.dep_ in ("nsubj", "nsubjpass") and subject_token is None:
                    subject_token = child
                if child.dep_ in ("dobj", "attr", "pobj", "oprd") and object_token is None:
                    object_token = child

            if not subject_token or not object_token:
                continue

            subj_text = _get_entity_span(subject_token, doc)
            obj_text  = _get_entity_span(object_token, doc)

            # Hard reject blacklisted subjects
            if subj_text.lower() in SUBJECT_BLACKLIST:
                continue
            if len(subj_text) < 2 or len(obj_text) < 2:
                continue

            subj_lower = subj_text.lower()
            obj_lower  = obj_text.lower()

            # Both subject AND object must match a known entity
            subj_match = any(en in subj_lower or subj_lower in en for en in entity_names)
            obj_match  = any(en in obj_lower  or obj_lower  in en for en in entity_names)

            if not subj_match or not obj_match:
                continue

            # Normalize to canonical entity name if possible
            subj_canonical = entity_lookup.get(subj_lower, subj_text)
            obj_canonical  = entity_lookup.get(obj_lower,  obj_text)

            rel = VERB_CANONICAL.get(lemma, VERB_CANONICAL.get(surface, lemma))

            # Real confidence: boost if both are known entities, decay with sentence length
            sent_len = len(list(sent))
            confidence = round(min(0.95, 0.70 + (0.10 if subj_match else 0) + (0.10 if obj_match else 0) - sent_len * 0.001), 2)

            key = f"{subj_lower}::{rel}::{obj_lower}"
            if key in seen:
                continue
            seen.add(key)

            relationships.append({
                "subject":      subj_canonical,
                "relationship": rel,
                "object":       obj_canonical,
                "source_file":  filename,
                "confidence":   confidence,
                "context":      sent.text[:150],
            })

    return relationships


def _extract_with_patterns(
    text: str,
    entities: List[Dict[str, Any]],
    filename: str,
) -> List[Dict[str, Any]]:
    relationships = []
    seen = set()

    entity_names = sorted(
        [e["name"] for e in entities],
        key=len, reverse=True,
    )

    if len(entity_names) < 2:
        return []

    verbs_re = "|".join(sorted(RELATIONSHIP_VERBS, key=len, reverse=True))

    for subj in entity_names:
        for obj in entity_names:
            if subj.lower() == obj.lower():
                continue
            pattern = re.compile(
                rf'\b{re.escape(subj)}\b.{{0,80}}\b({verbs_re})\b.{{0,80}}\b{re.escape(obj)}\b',
                re.IGNORECASE,
            )
            for m in pattern.finditer(text):
                verb = m.group(1).lower()
                rel  = VERB_CANONICAL.get(verb, verb)
                key  = f"{subj.lower()}::{rel}::{obj.lower()}"
                if key in seen:
                    continue
                seen.add(key)

                # Confidence based on proximity — shorter gap = higher confidence
                gap = len(m.group(0))
                confidence = round(max(0.50, 0.75 - gap * 0.002), 2)

                relationships.append({
                    "subject":      subj,
                    "relationship": rel,
                    "object":       obj,
                    "source_file":  filename,
                    "confidence":   confidence,
                    "context":      m.group(0)[:150],
                })

    return relationships


def extract_relationships(
    document_texts: Dict[str, str],
    entities: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    all_relationships: List[Dict[str, Any]] = []

    nlp = _get_spacy()  # ← use singleton check, not inline import
    use_spacy = nlp is not None

    for filename, text in document_texts.items():
        if not text or not text.strip():
            continue

        file_entities = [e for e in entities if filename in e.get("source_files", [])]
        if len(file_entities) < 2:
            file_entities = entities

        rels = (
            _extract_with_spacy(text, file_entities, filename)
            if use_spacy
            else _extract_with_patterns(text, file_entities, filename)
        )
        all_relationships.extend(rels)

    # Merge duplicates across files
    merged: Dict[str, Dict[str, Any]] = {}
    for rel in all_relationships:
        key = f"{rel['subject'].lower()}::{rel['relationship']}::{rel['object'].lower()}"
        if key not in merged:
            merged[key] = {
                "subject":      rel["subject"],
                "relationship": rel["relationship"],
                "object":       rel["object"],
                "source_files": [rel["source_file"]],
                "confidence":   rel["confidence"],
                "context":      rel.get("context", ""),
            }
        else:
            if rel["source_file"] not in merged[key]["source_files"]:
                merged[key]["source_files"].append(rel["source_file"])
            merged[key]["confidence"] = round(
                max(merged[key]["confidence"], rel["confidence"]), 2
            )

    return sorted(merged.values(), key=lambda r: r["confidence"], reverse=True)