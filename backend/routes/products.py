# ============================================================================
# BACKEND ROUTES - PRODUCTS
# ============================================================================
# routes/products.py
# ============================================================================

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from schemas.products import *
from schemas.auth import UserCreate, UserUpdate
from models.users import User
from models.products import *
from utils.helpers import row_to_dict

logger = logging.getLogger(__name__)

# Import security helpers
from config import settings
from utils.security import (
    get_current_user, 
    require_role,
    get_password_hash,
    create_tokens,
    verify_token,
    TokenResponse,
    verify_password
)
from configuration.mappings import CATEGORY_CONFIG

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="")

@router.post("/auth/register", response_model=UserResponse)
def register_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))  # Only admins can register users
):
    # Check existing user
    existing = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email or username already registered"
        )
    
    # Create user with safe defaults
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        allowed_categories=user.allowed_categories,
        role="user",  # Default role
        is_active=True,
        created_by=admin_user.id
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log registration
    logger.info(f"New user registered: {user.username} by {admin_user.username}")
    
    return db_user

@router.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Prevent timing attacks
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        # Log failed attempt
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Update last login
    user.last_login = datetime.now()
    db.commit()
    
    # Create tokens
    access_token, refresh_token = create_tokens(user.username, user.role)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = verify_token(refresh_token, "refresh")
    username = payload.get("sub")
    
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    new_access_token, _ = create_tokens(user.username, user.role)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

# Rotas de produtos com validação de categoria
@router.get("/products/{category_slug}", response_model=List[ProductItemResponse])
def get_products_by_category(
    category_slug: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check access permissions
    if not current_user.has_access_to_category(category_slug):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this category"
        )
    
    # Validate category exists
    if category_slug not in CATEGORY_CONFIG:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Safe query with parameterization
    model = CATEGORY_CONFIG[category_slug]["model"]
    products = db.query(model).offset(offset).limit(limit).all()
    
    results = [row_to_dict(p, slug=category_slug) for p in products]
    return [r for r in results if r is not None]

# Adicione também as rotas restantes que estavam no arquivo original
@router.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/categories", response_model=List[CategorySummary])
def get_available_categories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns categories available to the logged-in user, 
    including the count of items in each specific table.
    """
    user_access_list = current_user.allowed_categories or []
    
    results = []
    
    # Iterate over the defined config (ignoring SQL 'categories' table)
    for slug, config in CATEGORY_CONFIG.items():
        # Check if user has access (or is admin)
        if slug in user_access_list or current_user.role == "admin":
            model = config["model"]
            try:
                # Count items in the specific table
                count = db.query(model).count()
                results.append({
                    "name": config["name"],
                    "slug": slug,
                    "item_quantity": count
                })
            except Exception as e:
                # If table doesn't exist or error
                logger.error(f"Error counting table for {slug}: {e}")
                results.append({"name": config["name"], "slug": slug, "item_quantity": 0})
                
    return results

@router.get("/products/code/{product_code}", response_model=ProductItemResponse)
def get_product_globally(product_code: str, db: Session = Depends(get_db)):
    """
    Searches for a product across ALL configured categories.
    Used when we have the ID but don't know the category yet.
    """
    # Iterate through all configured tables
    for slug, config in CATEGORY_CONFIG.items():
        model = config["model"]
        # Try to find the product in this table
        product = db.query(model).filter(model.product_code == product_code).first()

        if product:
            # If found, return it with the slug context
            return row_to_dict(product, slug=slug)

    raise HTTPException(status_code=404, detail="Product not found in any category")

@router.get("/products/{category_slug}/{product_code}", response_model=ProductItemResponse)
def get_product_detail(
    category_slug: str,
    product_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Security Check
    user_access_list = current_user.allowed_categories or []
    if category_slug not in user_access_list and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
    
    config = CATEGORY_CONFIG.get(category_slug)
    if not config:
        raise HTTPException(status_code=404, detail="Category not found.")
    
    model = config["model"]
    
    # 2. Find Product
    # Since product codes might be strings with spaces, we decode or query directly
    product = db.query(model).filter(model.product_code == product_code).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this category.")
        
    return row_to_dict(product, slug=category_slug)

# Test if this file runs directly
if __name__ == "__main__":
    print("This is a router file, not meant to be run directly.")
    print("Run 'python app.py' instead.")