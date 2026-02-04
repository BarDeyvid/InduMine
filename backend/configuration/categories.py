# ============================================================================
# BACKEND CONFIG - CATEGORIES
# ============================================================================
# config/categories.py
# ============================================================================
from database import SessionLocal
from models.products import Category

db = SessionLocal()

CATEGORY_CONFIG = query = db.query(Category).all()

def get_all_categories():
    """Return list of all available category slugs"""
    return list(CATEGORY_CONFIG.keys())

def get_category_display_name(slug):
    """Get display name for a category slug"""
    if slug in CATEGORY_CONFIG:
        return CATEGORY_CONFIG[slug]["display_name"]
    return slug.replace("-", " ").title()