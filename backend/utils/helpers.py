# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

import json
from sqlalchemy import inspect

def get_category_path(category):
    """Get the full path of a category including all parents"""
    path = []
    current = category
    while current:
        path.insert(0, current.name)
        current = current.parent
    return " > ".join(path) if len(path) > 0 else ""

def row_to_dict(instance, slug=None):
    if instance is None:
        return None
        
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
    
    return {
        "product_code": data.get("id"),
        "name": data.get("name"),
        "image": data.get("images"),
        "url": data.get("url"),
        "category_slug": slug,
        "category_path": category_path,
        "specifications": specs,
        "scraped_at": data.get("scraped_at")
    }

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")