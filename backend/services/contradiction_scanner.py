import numpy as np
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity
from services.relationship_extractor import extract_relationships
from services.embedding_service import generate_embeddings

OPPOSING_VERBS = {
    "acquired": ["sold", "divested"],
    "developed": ["discontinued", "abandoned"],
    "founded": ["dissolved", "closed"],
    "uses": ["discontinued", "replaced", "abandoned"],
    "leads": ["resigned", "fired", "left"],
    "partnered_with": ["competed_with", "sued"],
    "merged_with": ["split_from", "separated"],
    "supports": ["opposes", "rejects"],
    "approved": ["rejected", "denied"],
    "increased": ["decreased", "reduced"],
    "caused": ["prevented", "avoided"],
}

def scan_for_contradictions(
    new_document_text: str,
    new_filename: str,
    workspace_relationships: list,
    workspace_document_texts: dict,
    workspace_entities: list,
) -> list:
    """
    Core scanning function. Returns list of contradiction dicts.
    """
    contradictions = []
    
    # Step 1 — Extract relationships from new document
    new_doc_dict = {new_filename: new_document_text}
    new_document_relationships = extract_relationships(new_doc_dict, workspace_entities)
    
    # Pre-process opposing verbs for quick lookup (both directions)
    opposing_map = {}
    for verb, opposites in OPPOSING_VERBS.items():
        if verb not in opposing_map:
            opposing_map[verb] = set()
        opposing_map[verb].update(opposites)
        for opp in opposites:
            if opp not in opposing_map:
                opposing_map[opp] = set()
            opposing_map[opp].add(verb)

    # Step 2 — Triple conflict detection
    for new_triple in new_document_relationships:
        n_subj = new_triple.get("subject", "").lower()
        n_obj = new_triple.get("object", "").lower()
        n_rel = new_triple.get("relationship", "").lower()
        
        for existing_triple in workspace_relationships:
            e_subj = existing_triple.get("subject", "").lower()
            e_obj = existing_triple.get("object", "").lower()
            e_rel = existing_triple.get("relationship", "").lower()
            
            # Direct contradiction Check
            if n_subj == e_subj and n_obj == e_obj and n_rel != e_rel:
                # Is it an opposing verb?
                if e_rel in opposing_map.get(n_rel, set()) or n_rel in opposing_map.get(e_rel, set()) or True:
                    # Let's consider any direct different verb for same subject+object as a relationship conflict
                    # but give priority to known opposites if needed. The instruction says:
                    # "If ... AND new_triple.relationship != existing_triple.relationship: This is a DIRECT CONTRADICTION"
                    contradictions.append({
                        "type": "relationship_conflict",
                        "severity": "high",
                        "confidence": 0.85,
                        "new_claim": {
                            "text": new_triple.get("context", f"{n_subj} {n_rel} {n_obj}"),
                            "filename": new_filename,
                            "triple": {
                                "subject": new_triple.get("subject"),
                                "relationship": new_triple.get("relationship"),
                                "object": new_triple.get("object")
                            }
                        },
                        "conflicting_claim": {
                            "text": existing_triple.get("context", f"{e_subj} {e_rel} {e_obj}"),
                            "filename": existing_triple.get("source_files", ["unknown"])[0] if existing_triple.get("source_files") else "unknown",
                            "triple": {
                                "subject": existing_triple.get("subject"),
                                "relationship": existing_triple.get("relationship"),
                                "object": existing_triple.get("object")
                            }
                        },
                        "explanation": f"Existing document says '{existing_triple.get('subject')} {existing_triple.get('relationship')} {existing_triple.get('object')}', but new document says '{new_triple.get('subject')} {new_triple.get('relationship')} {new_triple.get('object')}'.",
                        "suggested_resolution": f"Verify the correct relationship between {new_triple.get('subject')} and {new_triple.get('object')}."
                    })
                    continue
            
            # Inverted subject/object check
            if n_subj == e_obj and n_obj == e_subj:
                if e_rel in opposing_map.get(n_rel, set()):
                    contradictions.append({
                        "type": "inverted_claim",
                        "severity": "high" if 0.75 > 0.75 else "medium", # 0.75 is medium based on instructions
                        "confidence": 0.75,
                        "new_claim": {
                            "text": new_triple.get("context", f"{n_subj} {n_rel} {n_obj}"),
                            "filename": new_filename,
                            "triple": {
                                "subject": new_triple.get("subject"),
                                "relationship": new_triple.get("relationship"),
                                "object": new_triple.get("object")
                            }
                        },
                        "conflicting_claim": {
                            "text": existing_triple.get("context", f"{e_subj} {e_rel} {e_obj}"),
                            "filename": existing_triple.get("source_files", ["unknown"])[0] if existing_triple.get("source_files") else "unknown",
                            "triple": {
                                "subject": existing_triple.get("subject"),
                                "relationship": existing_triple.get("relationship"),
                                "object": existing_triple.get("object")
                            }
                        },
                        "explanation": f"Inverted claim detected: '{existing_triple.get('subject')} {existing_triple.get('relationship')} {existing_triple.get('object')}' vs '{new_triple.get('subject')} {new_triple.get('relationship')} {new_triple.get('object')}'.",
                        "suggested_resolution": f"Check the direction of the relationship between {new_triple.get('subject')} and {new_triple.get('object')}."
                    })

    # Step 3 — Semantic contradiction detection
    import re
    
    def split_sentences(text):
        # Basic sentence splitting
        sentences = re.split(r'(?<=[.!?]) +|\n+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 10]
        
    new_sentences = split_sentences(new_document_text)
    
    # Chunk workspace doc texts into sentences
    workspace_sentences = []
    workspace_sentences_meta = []
    for fname, ftext in workspace_document_texts.items():
        if fname == new_filename:
            continue
        sents = split_sentences(ftext)
        for s in sents:
            workspace_sentences.append(s)
            workspace_sentences_meta.append({"filename": fname, "text": s})
            
    if new_sentences and workspace_sentences:
        new_embeddings = generate_embeddings(new_sentences)
        ws_embeddings = generate_embeddings(workspace_sentences)
        
        # Calculate semantic similarity
        sim_matrix = cosine_similarity(new_embeddings, ws_embeddings)
        
        # Calculate Topic Similarity (TF-IDF keyword overlap proxy)
        from sklearn.feature_extraction.text import TfidfVectorizer
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            # Fit on all sentences to get global vocabulary
            vectorizer.fit(new_sentences + workspace_sentences)
            new_tfidf = vectorizer.transform(new_sentences)
            ws_tfidf = vectorizer.transform(workspace_sentences)
            topic_sim_matrix = cosine_similarity(new_tfidf, ws_tfidf)
            
            for i, new_s in enumerate(new_sentences):
                for j, ws_s in enumerate(workspace_sentences):
                    cos_sim = sim_matrix[i][j]
                    topic_sim = topic_sim_matrix[i][j]
                    
                    if cos_sim < 0.15 and topic_sim > 0.60:
                        conf = float(max(0.0, min(1.0, (0.6 - cos_sim) / 0.6)))
                        
                        severity = "low"
                        if conf > 0.75:
                            severity = "high"
                        elif conf >= 0.50:
                            severity = "medium"
                            
                        contradictions.append({
                            "type": "semantic_opposition",
                            "severity": severity,
                            "confidence": conf,
                            "new_claim": {
                                "text": new_s,
                                "filename": new_filename,
                                "triple": {}
                            },
                            "conflicting_claim": {
                                "text": ws_s,
                                "filename": workspace_sentences_meta[j]["filename"],
                                "triple": {}
                            },
                            "explanation": f"Sentences discuss the same topic but are semantically opposed.",
                            "suggested_resolution": "Review both sentences manually to resolve the semantic conflict."
                        })
        except Exception as e:
            print(f"[Scanner] Semantic semantic calculation error: {e}")

    # Step 4 — Score and rank
    # Correct severity for medium
    for c in contradictions:
        if c["confidence"] > 0.75:
            c["severity"] = "high"
        elif c["confidence"] >= 0.50:
            c["severity"] = "medium"
        else:
            c["severity"] = "low"
            
    contradictions.sort(key=lambda x: x["confidence"], reverse=True)
    return contradictions[:20]


def generate_contradiction_report(
    contradictions: list,
    new_filename: str,
    workspace_id: str,
) -> dict:
    high_count = sum(1 for c in contradictions if c["severity"] == "high")
    med_count = sum(1 for c in contradictions if c["severity"] == "medium")
    low_count = sum(1 for c in contradictions if c["severity"] == "low")
    
    rel_count = sum(1 for c in contradictions if c["type"] == "relationship_conflict")
    inv_count = sum(1 for c in contradictions if c["type"] == "inverted_claim")
    sem_count = sum(1 for c in contradictions if c["type"] == "semantic_opposition")
    
    risk_level = "clean"
    if high_count > 0:
        risk_level = "critical"
    elif med_count > 0 or low_count > 0:
        risk_level = "warning"
        
    recommendation = "No action required."
    if risk_level == "critical":
        recommendation = "Immediate review required for high-severity contradictions."
    elif risk_level == "warning":
        recommendation = "Review potential inconsistencies when possible."
        
    return {
        "workspace_id": workspace_id,
        "scanned_document": new_filename,
        "scan_timestamp": datetime.utcnow().isoformat() + "Z",
        "total_contradictions": len(contradictions),
        "severity_breakdown": { "high": high_count, "medium": med_count, "low": low_count },
        "type_breakdown": { 
            "relationship_conflict": rel_count,
            "inverted_claim": inv_count,
            "semantic_opposition": sem_count
        },
        "contradictions": contradictions,
        "risk_level": risk_level,
        "recommendation": recommendation
    }
