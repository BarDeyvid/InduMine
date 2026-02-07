# ============================================================================
# BACKEND SCHEMAS - PRODUCTS
# ============================================================================
# schemas/products.py
# ============================================================================

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class Token(BaseModel):
    """Basic Bearer token structure."""
    access_token: str
    token_type: str

class TokenResponse(BaseModel):
    """Detailed token response including refresh capabilities and expiry."""
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

# ============================================================================
# USER MANAGEMENT SCHEMAS
# ============================================================================

class UserCreate(BaseModel):
    """Schema for creating a new user, including role assignment."""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []
    role: Optional[str] = Field(None, pattern="^(admin|user|moderator)$")  

class UserUpdate(BaseModel):
    """Schema for partial updates to user profile data."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    allowed_categories: Optional[List[str]] = None

class UserResponse(BaseModel):
    """Public user profile data for API responses."""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    allowed_categories: List[str]

    model_config = ConfigDict(from_attributes=True)

# ============================================================================
# PRODUCT & CATEGORY SCHEMAS
# ============================================================================

class ProductBase(BaseModel):
    """Base fields for product data common across creation and retrieval."""
    id: str
    url: str
    name: str
    category_id: Optional[int] = None # Reference to Category table ID
    description: Optional[str] = None
    specs: Optional[Dict[str, Any]] = Field(default_factory=dict)
    images: Optional[str] = None # Stored as string to match crawler output
    scraped_at: str

class CategorySummary(BaseModel):
    """Summarized view of a category for navigation or breadcrumbs."""
    name: str
    slug: str
    item_quantity: int
    has_children: bool = False

class ProductItemResponse(BaseModel):
    """Specific product data formatted for UI list items or detail views."""
    product_code: str
    name: str
    image: Optional[str]
    url: Optional[str]
    category_slug: Optional[str] = None
    category_path: Optional[str] = None
    specifications: Dict[str, Any]
    scraped_at: Optional[str]

class ProductCreate(ProductBase):
    """Schema for inserting new products into the database."""
    pass

class ProductUpdate(BaseModel):
    """Schema for updating existing product information."""
    url: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    specs: Optional[Union[Dict[str, Any], str]] = None
    images: Optional[str] = None
    scraped_at: Optional[str] = None

class ProductResponse(ProductBase):
    """Standardized API response for product data."""
    model_config = ConfigDict(from_attributes=True)

# ============================================================================
# SYSTEM MONITORING SCHEMAS
# ============================================================================

class DatabaseHealthResponse(BaseModel):
    """Represents the operational status and metrics of the database."""
    health_percentage: int
    total_products: int
    total_categories: int
    total_users: int
    status: str

class LastSyncResponse(BaseModel):
    """Metrics regarding the last crawler/sync operation."""
    last_sync_timestamp: str
    last_sync_formatted: str
    total_products_synced: int
    sync_duration_seconds: Optional[float] = None