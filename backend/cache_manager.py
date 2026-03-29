"""
cache_manager.py
────────────────────────────────────────────────────────────────────
Thread-safe, in-memory caching layer for VerboAI.

Provides namespace-isolated caches with optional TTL and max-entries
eviction to prevent unbounded memory growth.

Usage:
    from cache_manager import get_cache, set_cache, make_cache_key

    key = make_cache_key(doc_content)
    cached = get_cache("embeddings", key)
    if cached is not None:
        return cached
    result = expensive_function()
    set_cache("embeddings", key, result)
────────────────────────────────────────────────────────────────────
"""

import hashlib
import logging
import threading
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

# Maximum number of entries per namespace before oldest entries are evicted
MAX_ENTRIES_PER_NAMESPACE = 200

# Default TTL in seconds (None = no expiration)
DEFAULT_TTL_SECONDS = None

# ═══════════════════════════════════════════════════════════════════
# INTERNAL STATE
# ═══════════════════════════════════════════════════════════════════

# Structure: { namespace: { key: { "value": Any, "expires_at": float|None, "created_at": float } } }
_cache_store: dict[str, dict[str, dict[str, Any]]] = {}

# One lock per namespace for fine-grained thread safety
_locks: dict[str, threading.Lock] = {}
_global_lock = threading.Lock()


def _get_lock(namespace: str) -> threading.Lock:
    """Get or create a lock for the given namespace."""
    if namespace not in _locks:
        with _global_lock:
            if namespace not in _locks:
                _locks[namespace] = threading.Lock()
    return _locks[namespace]


def _ensure_namespace(namespace: str) -> None:
    """Ensure the namespace exists in the store."""
    if namespace not in _cache_store:
        _cache_store[namespace] = {}


# ═══════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════

def make_cache_key(*args: Any) -> str:
    """
    Generate a deterministic SHA256 cache key from arbitrary arguments.
    Handles strings, lists, tuples, dicts (sorted), and other types via str().
    """
    parts = []
    for arg in args:
        if isinstance(arg, (list, tuple)):
            # Sort for determinism if elements are comparable
            try:
                parts.append(str(sorted(arg)))
            except TypeError:
                parts.append(str(arg))
        elif isinstance(arg, dict):
            parts.append(str(sorted(arg.items())))
        else:
            parts.append(str(arg))

    raw = "||".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cache(namespace: str, key: str) -> Optional[Any]:
    """
    Retrieve a value from the cache.

    Returns None on miss or if the entry has expired (lazy expiration).
    Logs cache HIT/MISS for observability.
    """
    lock = _get_lock(namespace)
    key_preview = key[:12]  # Short prefix for readable logs

    with lock:
        _ensure_namespace(namespace)
        entry = _cache_store[namespace].get(key)

        if entry is None:
            logger.info(f"Cache MISS: {namespace}:{key_preview}")
            return None

        # Check TTL expiration
        if entry["expires_at"] is not None and time.time() > entry["expires_at"]:
            del _cache_store[namespace][key]
            logger.info(f"Cache MISS (expired): {namespace}:{key_preview}")
            return None

        logger.info(f"Cache HIT: {namespace}:{key_preview}")
        return entry["value"]


def set_cache(
    namespace: str,
    key: str,
    value: Any,
    ttl_seconds: Optional[int] = DEFAULT_TTL_SECONDS,
) -> None:
    """
    Store a value in the cache.

    Args:
        namespace:    Logical grouping (e.g. "embeddings", "pipeline", "rag_chat")
        key:          Cache key (use make_cache_key() to generate)
        value:        The value to cache
        ttl_seconds:  Time-to-live in seconds. None = no expiration.
    """
    lock = _get_lock(namespace)
    key_preview = key[:12]

    with lock:
        _ensure_namespace(namespace)
        store = _cache_store[namespace]

        # Evict oldest entries if at capacity
        if len(store) >= MAX_ENTRIES_PER_NAMESPACE and key not in store:
            oldest_key = min(store, key=lambda k: store[k]["created_at"])
            del store[oldest_key]
            logger.debug(f"Cache evicted oldest entry in '{namespace}'")

        expires_at = (time.time() + ttl_seconds) if ttl_seconds else None

        store[key] = {
            "value":      value,
            "expires_at": expires_at,
            "created_at": time.time(),
        }

        logger.info(f"Cache SET: {namespace}:{key_preview}")


def clear_cache(namespace: str) -> int:
    """
    Clear all entries in a specific namespace.
    Returns the number of entries cleared.
    """
    lock = _get_lock(namespace)
    with lock:
        _ensure_namespace(namespace)
        count = len(_cache_store[namespace])
        _cache_store[namespace] = {}
        logger.info(f"Cache CLEARED: {namespace} ({count} entries)")
        return count


def clear_all_caches() -> dict[str, int]:
    """
    Clear all namespaces. Returns a dict of {namespace: entries_cleared}.
    """
    with _global_lock:
        result = {}
        for ns in list(_cache_store.keys()):
            lock = _get_lock(ns)
            with lock:
                result[ns] = len(_cache_store[ns])
                _cache_store[ns] = {}
        logger.info(f"Cache CLEARED ALL: {result}")
        return result


def get_cache_stats() -> dict[str, Any]:
    """
    Return current cache statistics for debugging/monitoring.
    """
    with _global_lock:
        stats = {}
        for ns, store in _cache_store.items():
            stats[ns] = {
                "entries": len(store),
                "keys_preview": list(store.keys())[:5],  # first 5 keys
            }
        return {
            "namespaces": stats,
            "total_entries": sum(len(s) for s in _cache_store.values()),
        }
