# ============================================================================
# BACKEND CONFIG - CATEGORIES
# ============================================================================
# config/categories.py
# ============================================================================
from database import SessionLocal
from models.products import Category
def get_all_categories():
    """Return list of all available category slugs"""
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        return [cat.slug for cat in categories]
    finally:
        db.close()

def get_category_display_name(slug, lang="en"):
    """Get display name for a category slug"""
    from utils.helpers import get_translator
    db = SessionLocal()
    try:
        category = db.query(Category).filter(Category.slug == slug).first()
        if category:
            translator = get_translator(lang)
            return translator(category.name or "")
        return slug.replace("-", " ").title()
    finally:
        db.close()