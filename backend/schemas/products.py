# ============================================================================
# BACKEND SCHEMAS - PRODUCTS
# ============================================================================
# schemas/products.py
# ============================================================================

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ============================================================================
# PYDANTIC SCHEMAS (Validation)
# ============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    allowed_categories: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    allowed_categories: List[str]

    model_config = ConfigDict(from_attributes=True)

class CategorySummary(BaseModel):
    name: str
    slug: str
    item_quantity: int

class ProductItemResponse(BaseModel):
    product_code: str
    image: Optional[str]
    url: Optional[str]
    category_slug: Optional[str] = None
    specifications: Dict[str, Any]