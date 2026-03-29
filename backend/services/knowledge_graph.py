"""
services/knowledge_graph.py
Builds graph JSON for frontend D3 force visualisation.
nodes: [ { id, label, type, weight, degree, ... } ]
edges: [ { source, target, relationship, weight, ... } ]
"""

import re
from typing import List, Dict, Any

TYPE_COLORS = {
    "person":       "#a78bfa",
    "organization": "#34d399",
    "location":     "#38bdf8",
    "technology":   "#fbbf24",
    "product":      "#f472b6",
    "unknown":      "#94a3b8",
}

TYPE_SHAPES = {
    "person":       "circle",
    "organization": "square",
    "location":     "diamond",
    "technology":   "triangle",
    "product":      "hexagon",
    "unknown":      "circle",
}


def _make_node_id(name: str) -> str:
    """
    Canonical node ID — lowercase, spaces→underscore, strip non-alphanum except underscore.
    Must be applied identically when building nodes AND when resolving edge endpoints.
    """
    return re.sub(r'[^\w]', '_', name.lower().strip()).strip('_')


def _resolve_entity_name(raw: str, entity_index: Dict[str, str]) -> str:
    """
    Given a raw subject/object string from a relationship, find the best
    matching canonical entity name. Falls back to raw if no match.
    """
    raw_id = _make_node_id(raw)

    # Exact match
    if raw_id in entity_index:
        return entity_index[raw_id]

    # Substring match — find entity whose id contains raw_id or vice versa
    for eid, ename in entity_index.items():
        if raw_id in eid or eid in raw_id:
            return ename

    return raw  # fallback — will create an orphan node


def build_knowledge_graph(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
) -> Dict[str, Any]:

    nodes: Dict[str, Dict[str, Any]] = {}

    # ── Build nodes with canonical IDs ────────────────────────────────────
    for ent in entities:
        node_id = _make_node_id(ent["name"])
        if node_id not in nodes:
            nodes[node_id] = {
                "id":           node_id,
                "label":        ent["name"],
                "type":         ent.get("type", "unknown"),
                "color":        TYPE_COLORS.get(ent.get("type", "unknown"), "#94a3b8"),
                "shape":        TYPE_SHAPES.get(ent.get("type", "unknown"), "circle"),
                "weight":       1,
                "source_files": ent.get("source_files", []),
                "confidence":   ent.get("confidence", 0.5),
                "degree":       0,
            }
        else:
            nodes[node_id]["weight"] += 1
            # Keep highest confidence
            nodes[node_id]["confidence"] = max(
                nodes[node_id]["confidence"], ent.get("confidence", 0.5)
            )

    # Build entity index for relationship resolution: node_id → canonical label
    entity_index: Dict[str, str] = {nid: n["label"] for nid, n in nodes.items()}

    # ── Build edges, resolving subject/object to canonical node IDs ────────
    edges: List[Dict[str, Any]] = []
    seen_edges: set = set()

    for rel in relationships:
        # Resolve to canonical entity names first
        subj_name = _resolve_entity_name(rel["subject"], entity_index)
        obj_name  = _resolve_entity_name(rel["object"],  entity_index)

        src_id = _make_node_id(subj_name)
        tgt_id = _make_node_id(obj_name)

        if src_id == tgt_id:
            continue  # skip self-loops

        rel_label = rel["relationship"].replace("_", " ")
        edge_key  = f"{src_id}::{rel['relationship']}::{tgt_id}"

        # Ensure both endpoint nodes exist (add orphan nodes for rel-only entities)
        for nid, label in [(src_id, subj_name), (tgt_id, obj_name)]:
            if nid not in nodes:
                nodes[nid] = {
                    "id":           nid,
                    "label":        label,
                    "type":         "unknown",
                    "color":        TYPE_COLORS["unknown"],
                    "shape":        TYPE_SHAPES["unknown"],
                    "weight":       1,
                    "source_files": rel.get("source_files", []),
                    "confidence":   0.4,
                    "degree":       0,
                }

        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)

        edges.append({
            "id":           edge_key,
            "source":       src_id,
            "target":       tgt_id,
            "relationship": rel["relationship"],
            "label":        rel_label,
            "weight":       rel.get("confidence", 0.5),
            "source_files": rel.get("source_files", []),
            "context":      rel.get("context", ""),
        })

    # ── Compute degree on final node set ──────────────────────────────────
    for edge in edges:
        nodes[edge["source"]]["degree"] += 1
        nodes[edge["target"]]["degree"] += 1

    # ── Filter nodes to only include those with relationships ─────────────
    filtered_nodes = [node for node in nodes.values() if node["degree"] > 0]

    # ── Stats ─────────────────────────────────────────────────────────────
    type_breakdown: Dict[str, int] = {}
    for node in filtered_nodes:
        t = node["type"]
        type_breakdown[t] = type_breakdown.get(t, 0) + 1

    return {
        "nodes": filtered_nodes,
        "edges": edges,
        "stats": {
            "total_nodes":           len(filtered_nodes),
            "total_edges":           len(edges),
            "entity_type_breakdown": type_breakdown,
        },
    }


def get_entity_connections(
    entity_name: str,
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
) -> Dict[str, Any]:
    name_lower = entity_name.lower()
    entity_record = next(
        (e for e in entities if e["name"].lower() == name_lower), None
    )

    connections = []
    related_docs: set = set()

    for rel in relationships:
        if rel["subject"].lower() == name_lower:
            connections.append({
                "related_entity": rel["object"],
                "relationship":   rel["relationship"],
                "direction":      "outgoing",
                "source_files":   rel.get("source_files", []),
                "confidence":     rel.get("confidence", 0.5),
                "context":        rel.get("context", ""),
            })
            related_docs.update(rel.get("source_files", []))
        elif rel["object"].lower() == name_lower:
            connections.append({
                "related_entity": rel["subject"],
                "relationship":   rel["relationship"],
                "direction":      "incoming",
                "source_files":   rel.get("source_files", []),
                "confidence":     rel.get("confidence", 0.5),
                "context":        rel.get("context", ""),
            })
            related_docs.update(rel.get("source_files", []))

    if entity_record:
        related_docs.update(entity_record.get("source_files", []))

    return {
        "entity":             entity_record or {"name": entity_name, "type": "unknown"},
        "connections":        sorted(connections, key=lambda c: c["confidence"], reverse=True),
        "related_documents":  sorted(related_docs),
        "relationship_types": list({c["relationship"] for c in connections}),
        "connection_count":   len(connections),
    }