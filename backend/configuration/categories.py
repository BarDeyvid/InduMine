# ============================================================================
# BACKEND CONFIG - CATEGORIES
# ============================================================================
# config/categories.py
# ============================================================================

# Define available categories and their configuration
CATEGORY_CONFIG = {
    # Define categories that exist in your system
    "electronics": {
        "name": "Electronics",
        "display_name": "Electronics"
    },
    "clothing": {
        "name": "Clothing",
        "display_name": "Clothing"
    },
    "home-garden": {
        "name": "Home & Garden",
        "display_name": "Home & Garden"
    },
    # Add more categories as needed
}

def get_all_categories():
    """Return list of all available category slugs"""
    return list(CATEGORY_CONFIG.keys())

def get_category_display_name(slug):
    """Get display name for a category slug"""
    if slug in CATEGORY_CONFIG:
        return CATEGORY_CONFIG[slug]["display_name"]
    return slug.replace("-", " ").title()