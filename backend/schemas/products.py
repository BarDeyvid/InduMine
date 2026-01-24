# ============================================================================
# BACKEND SCHEMAS - PRODUCTS
# ============================================================================
# schemas/products.py
# ============================================================================

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime

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
    role: Optional[str] = Field(None, pattern="^(admin|user|moderator)$")  

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

class ProductBase(BaseModel):
    id: str
    url: str
    name: str
    category_id: Optional[int] = None # Referência ao ID da tabela categories
    description: Optional[str] = None
    specs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    images: Optional[str] = None # Mantido como string para bater com o crawler
    scraped_at: str

class CategorySummary(BaseModel):
    name: str
    slug: str
    item_quantity: int
    has_children: bool = False

class ProductItemResponse(BaseModel):
    product_code: str
    name: str
    image: Optional[str]
    url: Optional[str]
    category_slug: Optional[str] = None
    category_path: Optional[str] = None
    specifications: Dict[str, Any]
    scraped_at: Optional[str]
class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None  # Changed from Dict to string
    specs: Optional[Union[Dict[str, Any], str]] = None  # Can be dict or JSON string
    images: Optional[str] = None
    scraped_at: Optional[str] = None

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

class DatabaseHealthResponse(BaseModel):
    health_percentage: int
    total_products: int
    total_categories: int
    total_users: int
    status: str  # "excellent", "good", "fair", "poor"

class LastSyncResponse(BaseModel):
    last_sync_timestamp: str
    last_sync_formatted: str
    total_products_synced: int
    sync_duration_seconds: Optional[float] = None