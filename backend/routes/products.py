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
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from schemas.products import *
from schemas.auth import *
from models.users import User
from models.products import Products
from utils.helpers import row_to_dict
from configuration.categories import CATEGORY_CONFIG, get_all_categories, get_category_display_name

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

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="")

@router.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(or_(User.email == user.email, User.username == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email or Username already registered")

    hashed_pw = get_password_hash(user.password)

    # By default, new users might get access to everything or nothing.
    # Here we default to access all categories if none provided, for testing ease.
    categories_to_assign = user.allowed_categories if user.allowed_categories else list(CATEGORY_CONFIG.keys())

    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_pw,
        full_name=user.full_name,
        allowed_categories=categories_to_assign,
        role="user",
        is_active=True,
        created_at=str(datetime.now())
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


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

@router.post("/auth/login-form", response_model=TokenResponse)
def login_form(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Alternative login endpoint using JSON instead of form data"""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    if not verify_password(login_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for user: {login_data.username}")
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

@router.post("/auth/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow users to change their own password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )
    
    # Update to new password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    logger.info(f"User {current_user.username} changed their password")
    
    return {"message": "Password changed successfully"}

@router.get("/auth/check-username/{username}")
def check_username_availability(
    username: str,
    db: Session = Depends(get_db)
):
    """Check if a username is available (public endpoint)"""
    existing = db.query(User).filter(User.username == username).first()
    
    return {
        "username": username,
        "available": existing is None
    }

@router.get("/auth/check-email/{email}")
def check_email_availability(
    email: str,
    db: Session = Depends(get_db)
):
    """Check if an email is available (public endpoint)"""
    existing = db.query(User).filter(User.email == email).first()
    
    return {
        "email": email,
        "available": existing is None
    }

# Rotas de produtos com validação de categoria
@router.get("/products/{category_slug}", response_model=List[ProductItemResponse])
def get_products_by_category(
    category_slug: str,
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check access permissions
    if not has_access_to_category(current_user, category_slug):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this category"
        )
    
    # Validate category exists
    if category_slug not in CATEGORY_CONFIG:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Build query for the single Products table
    query = db.query(Products).filter(Products.category == category_slug)
    
    # Add search filter if query parameter provided
    if q:
        search_filter = or_(
            Products.name.ilike(f"%{q}%"),
            Products.id.ilike(f"%{q}%")
        )
        query = query.filter(search_filter)
    
    # Get products with pagination
    products = query.order_by(Products.id).offset(offset).limit(limit).all()
    
    # Convert to response format
    results = [row_to_dict(p, slug=category_slug) for p in products]
    return [r for r in results if r is not None]

@router.get("/categories", response_model=List[CategorySummary])
def get_available_categories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns categories available to the logged-in user, 
    with count of items in each category from the single products table.
    """
    user_access_list = current_user.allowed_categories or []
    
    results = []
    
    # Get categories from config
    for slug, config in CATEGORY_CONFIG.items():
        # Check if user has access (or is admin)
        if slug in user_access_list or current_user.role == "admin":
            try:
                # Count items in this category from the products table
                count = db.query(Products).filter(Products.category == slug).count()
                results.append({
                    "name": config["display_name"],
                    "slug": slug,
                    "item_quantity": count
                })
            except Exception as e:
                logger.error(f"Error counting products for category {slug}: {e}")
                results.append({
                    "name": config["display_name"], 
                    "slug": slug, 
                    "item_quantity": 0
                })
    
    return results

@router.get("/products/code/{product_code}", response_model=ProductItemResponse)
def get_product_globally(
    product_code: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Searches for a product across ALL categories in the single products table.
    """
    # Find the product
    product = db.query(Products).filter(Products.id == product_code).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user has access to this product's category
    if not has_access_to_category(current_user, product.category):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this product's category"
        )
    
    return row_to_dict(product, slug=product.category)

@router.get("/products/{category_slug}/{product_code}", response_model=ProductItemResponse)
def get_product_detail(
    category_slug: str,
    product_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Security Check
    if not has_access_to_category(current_user, category_slug):
        raise HTTPException(status_code=403, detail="Access denied to this category")
    
    # 2. Validate category exists
    if category_slug not in CATEGORY_CONFIG:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 3. Find Product
    product = db.query(Products).filter(
        Products.id == product_code,
        Products.category == category_slug
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this category")
        
    return row_to_dict(product, slug=category_slug)

@router.get("/search", response_model=List[ProductItemResponse])
def search_products(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search products across all categories the user has access to.
    """
    user_categories = current_user.allowed_categories or []
    
    # Build query with user's accessible categories
    query = db.query(Products)
    
    if current_user.role != "admin":
        query = query.filter(Products.category.in_(user_categories))
    
    # Add search filters
    search_filter = or_(
        Products.name.ilike(f"%{q}%"),
        Products.id.ilike(f"%{q}%"),
        Products.category.ilike(f"%{q}%")
    )
    query = query.filter(search_filter)
    
    # Execute query
    products = query.limit(limit).all()
    
    # Convert to response format
    results = [row_to_dict(p, slug=p.category) for p in products]
    return [r for r in results if r is not None]

# Helper function for category access check
def has_access_to_category(user: User, category_slug: str) -> bool:
    """Check if user has access to a specific category"""
    if user.role == "admin":
        return True
    
    user_categories = user.allowed_categories or []
    return category_slug in user_categories

# Test if this file runs directly
if __name__ == "__main__":
    print("This is a router file, not meant to be run directly.")
    print("Run 'python app.py' instead.")