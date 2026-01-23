# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

import json
from sqlalchemy import inspect

def row_to_dict(instance, slug=None):
    if instance is None:
        return None
        
    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}
    
    # Prioriza o slug passado manualmente ou busca via relacionamento
    # Se o crawler usou a estrutura de categoria separada:
    category_slug = slug
    if not category_slug and hasattr(instance, 'category_rel') and instance.category_rel:
        category_slug = instance.category_rel.slug

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
        "category_slug": category_slug,
        "specifications": specs,
        "scraped_at": data.get("scraped_at")
    }

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")