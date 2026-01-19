# ============================================================================
# BACKEND UTILITIES - HELPERS
# ============================================================================
# utils/helpers.py
# ============================================================================

from sqlalchemy import inspect

def row_to_dict(instance, slug=None):  
    """Converts a SQLAlchemy row to a standardized dict with 'specifications'."""  
    if instance is None:  
        return None  
        
    # Extrai os dados das colunas  
    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}  
    
    base = {  
        "product_code": data.get("product_code", "N/A"),  
        "image": data.get("product_image"),  
        "url": data.get("product_url"),  
        "category_slug": slug, 
        "specifications": {}  
    }  
    
    # Campos que NÃO devem ir para specifications  
    exclude = ["product_code", "product_image", "product_url", "category_name"]  
    
    for key, val in data.items():  
        if key not in exclude and val is not None: 
            base["specifications"][key] = val  
                
    return base

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")