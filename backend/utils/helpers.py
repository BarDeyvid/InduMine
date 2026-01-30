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
    """Convert a SQLAlchemy instance (product) to a serializable dict.

    Accepts optional `lang` parameter (language code) to translate
    human-readable fields (name, category_path, and specifications). Default translation is noop.
    """
    if instance is None:
        return None
    # Default language parameter may be passed via kwargs in calls
    lang = getattr(instance, "_response_lang", None)
    if not lang:
        # Allow callers to pass lang via a temporary attribute on the instance
        # or by passing a kw-only param in the future. Default to English identity.
        lang = "en"

    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}

    # Get category path
    category_path = ""
    if hasattr(instance, 'category_rel') and instance.category_rel:
        category_path = get_category_path(instance.category_rel)
        if not slug:
            slug = instance.category_rel.slug

    # Get specs from instance and ensure it's a dictionary
    specs = data.get("specs", {})
    if isinstance(specs, str):
        try:
            specs = json.loads(specs)
        except (json.JSONDecodeError, ValueError):
            specs = {"raw_data": specs}

    # Perform translations for `name`, `category_path`, and `specifications` when requested
    translator = get_translator(lang)
    translated_name = translator(data.get("name") or "")
    translated_category_path = translator(category_path or "")
    
    # Translate specifications (both keys and values)
    translated_specs = {}
    if isinstance(specs, dict):
        for key, value in specs.items():
            translated_key = translator(key)
            translated_value = translator(str(value)) if value is not None else ""
            translated_specs[translated_key] = translated_value
    else:
        translated_specs = specs

    return {
        "product_code": data.get("id"),
        "name": translated_name,
        "image": data.get("images"),
        "url": data.get("url"),
        "category_slug": slug,
        "category_path": translated_category_path,
        "specifications": translated_specs,
        "scraped_at": data.get("scraped_at")
    }

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")