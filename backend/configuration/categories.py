# ============================================================================
# BACKEND CONFIG - CATEGORIES
# ============================================================================
# config/categories.py
# ============================================================================
from sqlalchemy import Column

from database import SessionLocal
from models.products import Category
from typing import Callable, List, Any
    
def get_all_categories() -> List[Column[str]]:
    """Returns a list of all category slugs in the database

    Returns:
        List[str]: A list of category slugs.
    """
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        return [cat.slug for cat in categories]
    finally:
        db.close()

def get_category_display_name(slug: str, lang: str = "en") -> str:
    """Returns the display name for a category based on its slug and language.

    Args:
        slug (str): The category slug.
        lang (str, optional): The language code. Defaults to "en".

    Returns:
        str: The display name for the category in the specified language.
    """
    from utils.helpers import get_translator
    db = SessionLocal()
    try:
        category = db.query(Category).filter(Category.slug == slug).first()
        if category:
            # Use the translator to get the display name in the desired language
            func: Any = get_translator(lang)
            translator: Callable[[str], str] = func 
            clean_name = str(category.name or "").strip()

            return translator(clean_name)
        return slug.replace("-", " ").title()
    finally:
        db.close()