from typing import List, Optional, Any, Dict
import pickle
import time

# Internal storage for serialized data and expiration timestamps
_cache: Dict[str, bytes] = {}
_cache_expiry: Dict[str, float] = {}

def cache_category_tree(key: str, data: List[Dict[Any, Any]], ttl: int = 3600) -> None:
    """
    Serializes and stores a category tree in the global in-memory cache.

    Args:
        key (str): A unique identifier used to retrieve or clear the cached data.
        data (List[Dict[Any, Any]]): The list of category dictionaries to be cached.
        ttl (int): Time-to-live in seconds. Defaults to 3600 (1 hour).

    Returns:
        None
    """
    try:
        _cache[key] = pickle.dumps(data)
        _cache_expiry[key] = time.time() + ttl
    except Exception as e:
        print(f"Error caching data for key '{key}': {e}")

def get_cached_category_tree(key: str) -> Optional[List[Dict[Any, Any]]]:
    """
    Retrieves and deserializes a category tree from the cache if it has not expired.

    Args:
        key (str): The unique identifier for the cached data.

    Returns:
        Optional[List[Dict[Any, Any]]]: The deserialized category tree if found 
        and valid; None if the key is missing, expired, or an error occurs.
    """
    try:
        if key in _cache:
            expiry = _cache_expiry.get(key, 0)
            
            if time.time() < expiry:
                return pickle.loads(_cache[key])
            else:
                clear_cache(key)
    except Exception as e:
        print(f"Error reading cache for key '{key}': {e}")
    
    return None

def clear_cache(key: Optional[str] = None) -> None:
    """
    Removes specific items or wipes the entire cache.

    Args:
        key (Optional[str]): The specific key to remove. If None, the entire 
            cache is cleared. Defaults to None.

    Returns:
        None
    """
    if key:
        _cache.pop(key, None)
        _cache_expiry.pop(key, None)
    else:
        _cache.clear()
        _cache_expiry.clear()