# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

from sqlalchemy import inspect
import json

def row_to_dict(instance, slug=None):
    """Converts a SQLAlchemy row to a standardized dict with 'specifications'."""
    if instance is None:
        return None
        
    # Extract column data
    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}
    
    # Handle images field - take first image if it's a comma-separated list
    images = data.get("images", "")
    if images and isinstance(images, str):
        # Split by comma and take first image
        image_list = [img.strip() for img in images.split(",") if img.strip()]
        first_image = image_list[0] if image_list else None
    else:
        first_image = None
    
    base = {
        "product_code": data.get("id"),  # Using id as product_code
        "image": first_image,
        "url": data.get("url"),
        "category_slug": slug or data.get("category"),
        "specifications": {}
    }
    
    # Parse specs text to dictionary if it exists
    specs_text = data.get("specs")
    if specs_text:
        try:
            # Try to parse as JSON first
            specs_dict = json.loads(specs_text)
            base["specifications"].update(specs_dict)
        except json.JSONDecodeError:
            # If not JSON, treat as key-value pairs
            for line in specs_text.split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    base["specifications"][key.strip()] = value.strip()
    
    # Add description if it exists (JSON field)
    description = data.get("description")
    if description:
        if isinstance(description, dict):
            base["specifications"].update(description)
        elif isinstance(description, str):
            try:
                desc_dict = json.loads(description)
                base["specifications"].update(desc_dict)
            except:
                base["specifications"]["description"] = description
    
    # Add other fields to specifications (excluding the base fields)
    exclude_fields = ["id", "url", "images", "category", "specs", "description", "scraped_at", "name"]
    
    for key, val in data.items():
        if key not in exclude_fields and val is not None:
            if key == "name":
                base["specifications"]["name"] = val
            else:
                base["specifications"][key] = val
    
    return base

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")