# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

import json
from typing import Any, Callable, Dict, List, Optional, Protocol, Union, cast

# --- Protocols for Structural Typing ---

class Translation(Protocol):
    """Protocol for objects that can perform text translation."""
    def translate(self, text: str) -> str: ...

class Language(Protocol):
    """Protocol for language objects, typically provided by argostranslate."""
    code: str
    def get_translation(self, to_lang: 'Language') -> Optional[Translation]: ...
    
class CategoryProtocol(Protocol):
    """Protocol defining the hierarchy structure of a category."""
    name: str
    slug: str
    parent: Optional['CategoryProtocol']

class InstanceProtocol(Protocol):
    """Protocol for database instances or data objects representing a product."""
    id: Any
    name: str
    images: Optional[str]
    url: str
    scraped_at: Any
    specs: Union[str, Dict[str, Any]]
    category_rel: Optional[CategoryProtocol]
    _response_lang: Optional[str]

# --- Translation Initialization ---
try:
    from argostranslate import translate as _arg_translate
    _success = True
except Exception:
    _arg_translate = None
    _success = False

_ARGOSTRANS_AVAILABLE = _success

# In-memory cache for translator functions to prevent redundant lookups
# (to_code) -> callable(text)
_TRANSLATOR_CACHE: Dict[str, Callable[[str], str]] = {}

# --- Helper Functions ---

def get_translator(to_code: Optional[str]) -> Callable[[str], str]:
    """
    Retrieves or creates a translator function for the specified language.

    This function attempts to use the `argostranslate` library. If the library
    is unavailable or the language pair is not installed, it returns an identity 
    function (returns the original string).

    Args:
        to_code (Optional[str]): The target language ISO code (e.g., 'es', 'fr').

    Returns:
        Callable[[str], str]: A function that takes a string and returns its translation.
    """
    code_str = (to_code or "").lower()
    
    if code_str in ("", "en"):
        return lambda s: s

    if code_str in _TRANSLATOR_CACHE:
        return _TRANSLATOR_CACHE[code_str]

    if not _ARGOSTRANS_AVAILABLE or _arg_translate is None:
        _TRANSLATOR_CACHE[code_str] = lambda s: s
        return _TRANSLATOR_CACHE[code_str]

    try:
        installed = cast(List[Language], _arg_translate.get_installed_languages())
        
        from_lang = next((l for l in installed if l.code.startswith('en')), None)
        to_lang = next((l for l in installed if l.code == code_str or l.code.startswith(f"{code_str}_")), None)

        if from_lang and to_lang:
            translation_obj = from_lang.get_translation(to_lang)
            if translation_obj:
                _TRANSLATOR_CACHE[code_str] = translation_obj.translate
                return _TRANSLATOR_CACHE[code_str]
    except Exception:
        pass

    _TRANSLATOR_CACHE[code_str] = lambda s: s
    return _TRANSLATOR_CACHE[code_str]

def get_category_path(category: Optional[CategoryProtocol]) -> str:
    """
    Constructs a breadcrumb string representing the category hierarchy.

    Args:
        category (Optional[CategoryProtocol]): The leaf category object.

    Returns:
        str: A string in the format "Parent > Child > Subchild" or empty string if None.
    """
    path: List[str] = []
    current = category
    while current:
        path.insert(0, current.name)
        current = current.parent
    return " > ".join(path) if len(path) > 0 else ""

def row_to_dict(instance: Optional[InstanceProtocol], slug: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Converts a database instance into a serializable dictionary, handling 
    translations and JSON parsing for specifications.

    Args:
        instance (Optional[InstanceProtocol]): The raw data instance.
        slug (Optional[str]): Override for the category slug. Defaults to the 
            slug found in the instance's category relation.

    Returns:
        Optional[Dict[str, Any]]: A dictionary containing processed product data, 
            or None if the instance is invalid.
    """
    if instance is None:
        return None
    
    lang = getattr(instance, "_response_lang", "en") or "en"
    category_path = ""
    
    if hasattr(instance, 'category_rel') and instance.category_rel:
        cat = instance.category_rel
        category_path = get_category_path(cat)
        if not slug:
            slug = cat.slug
    
    specs_raw = instance.specs
    specs: Dict[str, Any] = {}
    if isinstance(specs_raw, str):
        try:
            specs = json.loads(specs_raw)
        except json.JSONDecodeError:
            specs = {}
    else:
        specs = specs_raw
    
    data: Dict[str, Any] = {
        "product_code": instance.id,
        "name": instance.name,
        "image": instance.images.split(',')[0] if instance.images else None,
        "url": instance.url,
        "category_slug": slug,
        "category_path": category_path,
        "scraped_at": instance.scraped_at
    }
    
    if lang not in ["en", ""]:
        translator = get_translator(lang)
        data["name"] = translator(instance.name or "")
        data["category_path"] = translator(category_path)
        
        translated_specs: Dict[str, Any] = {}
        for k, v in specs.items():
            translated_key = translator(str(k))
            translated_val = translator(str(v)) if isinstance(v, str) else v
            translated_specs[translated_key] = translated_val
        data["specifications"] = translated_specs
    else:
        data["specifications"] = specs
    
    return data


if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")