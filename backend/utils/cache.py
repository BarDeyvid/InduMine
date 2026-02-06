from functools import lru_cache
from typing import List, Optional, Any
import pickle
import time

_cache = {}
_cache_expiry = {}

def cache_category_tree(key: str, data: List[dict], ttl: int = 3600):
    """Cache category tree data"""
    try:
        _cache[key] = pickle.dumps(data)
        _cache_expiry[key] = time.time() + ttl
    except Exception as e:
        print(f"Error caching data: {e}")

def get_cached_category_tree(key: str) -> Optional[List[dict]]:
    """Get cached category tree"""
    try:
        if key in _cache:
            expiry = _cache_expiry.get(key, 0)
            if time.time() < expiry:
                return pickle.loads(_cache[key])
            else:
                # Clean up expired cache
                del _cache[key]
                if key in _cache_expiry:
                    del _cache_expiry[key]
    except Exception as e:
        print(f"Error reading cache: {e}")
    return None

def clear_cache(key: str = None):
    """Clear cache"""
    if key:
        if key in _cache:
            del _cache[key]
        if key in _cache_expiry:
            del _cache_expiry[key]
    else:
        _cache.clear()
        _cache_expiry.clear()