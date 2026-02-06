# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

import json
from sqlalchemy import inspect

# Optional argostranslate integration for offline translations
try:
    from argostranslate import translate as _arg_translate
    _ARGOSTRANS_AVAILABLE = True
except Exception:
    _ARGOSTRANS_AVAILABLE = False


# Simple translator cache for (to_code) -> callable(text)->translated_text
_TRANSLATOR_CACHE = {}


def get_translator(to_code: str):
    """Return a translator function that translates from English to `to_code`.
    If argostranslate isn't available or the model isn't installed, returns identity.
    """
    to_code = (to_code or "").lower()
    if to_code in ("", "en"):
        return lambda s: s

    if to_code in _TRANSLATOR_CACHE:
        return _TRANSLATOR_CACHE[to_code]

    if not _ARGOSTRANS_AVAILABLE:
        print(f"Warning: Argostranslate not available; no translation for {to_code}")
        _TRANSLATOR_CACHE[to_code] = lambda s: s
        return _TRANSLATOR_CACHE[to_code]

    try:
        installed = _arg_translate.get_installed_languages()
        installed_codes = [(l.code, l) for l in installed if l.code]
        
        # Find English language
        from_lang = None
        for code, lang_obj in installed_codes:
            if code.startswith('en'):
                from_lang = lang_obj
                break
        
        # Find target language with exact or prefix match
        to_lang = None
        for code, lang_obj in installed_codes:
            if code == to_code or code.startswith(to_code + '_') or code.startswith(to_code + '-'):
                to_lang = lang_obj
                break
        
        if not from_lang:
            print(f"Warning: English language not found in Argos. Available: {[c for c, _ in installed_codes]}")
            _TRANSLATOR_CACHE[to_code] = lambda s: s
        elif not to_lang:
            print(f"Warning: Language {to_code} not found in Argos. Available: {[c for c, _ in installed_codes]}")
            _TRANSLATOR_CACHE[to_code] = lambda s: s
        else:
            translation = from_lang.get_translation(to_lang)
            print(f"Successfully loaded translator: English -> {to_code}")
            _TRANSLATOR_CACHE[to_code] = translation.translate
    except Exception as e:
        print(f"Error loading translator for {to_code}: {e}")
        _TRANSLATOR_CACHE[to_code] = lambda s: s

    return _TRANSLATOR_CACHE[to_code]

def get_category_path(category):
    """Get the full path of a category including all parents"""
    path = []
    current = category
    while current:
        path.insert(0, current.name)
        current = current.parent
    return " > ".join(path) if len(path) > 0 else ""

def row_to_dict(instance, slug=None):
    """Optimized version of row_to_dict"""
    if instance is None:
        return None
    
    lang = getattr(instance, "_response_lang", "en")
    
    # Pre-translate category path if available
    if hasattr(instance, 'category_rel') and instance.category_rel:
        category = instance.category_rel
        # Build path efficiently
        path_parts = []
        current = category
        while current:
            path_parts.insert(0, current.name)
            current = current.parent
        
        category_path = " > ".join(path_parts) if path_parts else ""
        if not slug:
            slug = category.slug
    else:
        category_path = ""
    
    # Use dict comprehension for better performance
    data = {
        "product_code": instance.id,
        "name": instance.name,
        "image": instance.images.split(',')[0] if instance.images else None,
        "url": instance.url,
        "category_slug": slug,
        "category_path": category_path,
        "scraped_at": instance.scraped_at
    }
    
    # Handle specs efficiently
    specs = instance.specs
    if isinstance(specs, str):
        try:
            specs = json.loads(specs)
        except:
            specs = {}
    
    # Translate only if needed
    if lang not in ["en", ""]:
        translator = get_translator(lang)
        data["name"] = translator(instance.name or "")
        data["category_path"] = translator(category_path)
        
        if specs:
            translated_specs = {}
            for key, value in specs.items():
                if isinstance(value, str):
                    translated_specs[translator(key)] = translator(value)
                else:
                    translated_specs[translator(key)] = value
            data["specifications"] = translated_specs
        else:
            data["specifications"] = {}
    else:
        data["specifications"] = specs or {}
    
    return data


if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")