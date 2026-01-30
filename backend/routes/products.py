# ============================================================================
# BACKEND ROUTES - PRODUCTS
# ============================================================================
# routes/products.py
# ============================================================================

import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from datetime import datetime
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, aliased
from typing import List, Optional
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from database import get_db
from schemas.products import *
from schemas.auth import *
from models.users import User
from models.products import Category, Products
from utils.helpers import row_to_dict, get_translator
from configuration.categories import CATEGORY_CONFIG, get_all_categories, get_category_display_name

logger = logging.getLogger(__name__)

# Import security helpers
from config import settings
from utils.security import *

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="")

def get_category_descendants(db, category_slug):
    """Get all descendant category IDs for a given category slug (including itself)"""
    # Using recursive CTE to get all descendants
    category = aliased(Category, name='category')
    category_tree = (
        db.query(category.id)
        .filter(category.slug == category_slug)
        .cte(name='category_tree', recursive=True)
    )
    
    child = aliased(Category, name='child')
    category_tree = category_tree.union_all(
        db.query(child.id)
        .filter(child.parent_id == category_tree.c.id)
    )
    
    return category_tree


# Auth routes (unchanged)
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

# Helper function for category access check
def has_access_to_category(user: User, category_slug: str, db: Session) -> bool:
    """Check if user has access to a specific category or any of its ancestors"""
    if user.role == "admin":
        return True
    
    # Get the category by slug
    category = db.query(Category).filter(Category.slug == category_slug).first()
    if not category:
        return False
    
    # Check the allowed_categories list for the category and all its ancestors
    current_category = category
    while current_category:
        if current_category.slug in (user.allowed_categories or []):
            return True
        current_category = current_category.parent
    
    return False

# Product routes with category validation
@router.get("/products/{category_slug}", response_model=list[ProductItemResponse])
def get_products_by_category(category_slug: str, db: Session = Depends(get_db), lang: str = Query("pt", description="Language code: en, es, pt")):
    # 1. Get the category tree (all descendant categories)
    category_tree = get_category_descendants(db, category_slug)
    
    # 2. Get category IDs from the tree
    category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
    
    if not category_ids:
        return []
    
    # 3. Get products from all descendant categories
    products = db.query(Products).filter(Products.category_id.in_(category_ids)).all()
    # Attach requested language to each instance for translation in row_to_dict
    for p in products:
        setattr(p, "_response_lang", lang)

    return [row_to_dict(p, slug=category_slug) for p in products]

@router.get("/categories", response_model=list[CategorySummary])
def get_categories(db: Session = Depends(get_db), lang: str = Query("pt", description="Language code: en, es, pt")):
    top_categories = db.query(Category).filter(Category.parent_id == None).all()
    
    results = []
    translator = get_translator(lang)
    for cat in top_categories:
        category_tree = get_category_descendants(db, cat.slug)
        category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
        
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar()
        results.append({
            "name": translator(cat.name or ""),
            "slug": cat.slug,
            "item_quantity": count or 0,
            "has_children": len(cat.children) > 0
        })
    
    return results

@router.get("/categories/tree", response_model=list[dict])
def get_category_tree(db: Session = Depends(get_db), lang: str = Query("pt", description="Language code: en, es, pt")):
    """Get the complete category hierarchy tree"""
    translator = get_translator(lang)

    def build_tree(category):
        category_tree = get_category_descendants(db, category.slug)
        category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar()

        node = {
            "id": category.id,
            "name": translator(category.name or ""),
            "slug": category.slug,
            "item_quantity": count or 0,
            "children": []
        }

        for child in sorted(category.children, key=lambda x: x.name):
            node["children"].append(build_tree(child))

        return node
    
    top_categories = db.query(Category).filter(Category.parent_id == None).all()
    return [build_tree(cat) for cat in sorted(top_categories, key=lambda x: x.name)]

@router.get("/categories/{slug}/children")
def get_category_children(slug: str, db: Session = Depends(get_db), lang: str = Query("pt", description="Language code: en, es, pt")):
    """Get direct children of a category"""
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    children = []
    translator = get_translator(lang)
    for child in category.children:
        category_tree = get_category_descendants(db, child.slug)
        category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar()
        children.append({
            "id": child.id,
            "name": translator(child.name or ""),
            "slug": child.slug,
            "item_quantity": count or 0,
            "has_children": len(child.children) > 0
        })
    
    return children

@router.get("/products/code/{product_code}", response_model=ProductItemResponse)
def get_product_globally(
    product_code: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pt", description="Language code: en, es, pt")
):
    """
    Searches for a product across ALL categories in the single products table.
    """
    # Find the product
    product = db.query(Products).filter(Products.id == product_code).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user has access to this product's category
    if not has_access_to_category(current_user, product.category_rel.slug, db):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this product's category"
        )
    
    setattr(product, "_response_lang", lang)
    return row_to_dict(product, slug=product.category_rel.slug)

@router.get("/products/{category_slug}/{product_code}", response_model=ProductItemResponse)
def get_product_detail(
    category_slug: str,
    product_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pt", description="Language code: en, es, pt")
):
    # 1. Security Check
    if not has_access_to_category(current_user, category_slug, db):
        raise HTTPException(status_code=403, detail="Access denied to this category")
    
    # 2. Get the category tree
    category_tree = get_category_descendants(db, category_slug)
    category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
    
    if not category_ids:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 3. Find Product in the category tree
    product = db.query(Products).filter(
        Products.id == product_code,
        Products.category_id.in_(category_ids)
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this category")
        
    setattr(product, "_response_lang", lang)
    return row_to_dict(product, slug=category_slug)

@router.get("/search", response_model=List[ProductItemResponse])
def search_products(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pt", description="Language code: en, es, pt")
):
    """
    Search products across all categories the user has access to.
    """
    # Get all categories the user has access to
    user_categories = current_user.allowed_categories or []
    
    # Build a list of all accessible category IDs (including descendants)
    accessible_category_ids = set()
    for category_slug in user_categories:
        category_tree = get_category_descendants(db, category_slug)
        category_ids = [id for (id,) in db.query(category_tree.c.id).all()]
        accessible_category_ids.update(category_ids)
    
    # Build query
    query = db.query(Products)
    
    if current_user.role != "admin":
        query = query.filter(Products.category_id.in_(accessible_category_ids))
    
    # Add search filters
    search_filter = or_(
        Products.name.ilike(f"%{q}%"),
        Products.id.ilike(f"%{q}%"),
        Products.description.ilike(f"%{q}%")
    )
    query = query.filter(search_filter)
    
    # Execute query
    products = query.limit(limit).all()
    for p in products:
        setattr(p, "_response_lang", lang)

    # Convert to response format (default to Portuguese unless caller provided param)
    results = [row_to_dict(p) for p in products]
    return [r for r in results if r is not None]

# Admin endpoints for product management
@router.post("/admin/products", response_model=ProductResponse)
@limiter.limit("5/minute")
def create_product(
    request: Request,
    product: ProductCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a new product"""
    # Check if product already exists
    existing = db.query(Products).filter(Products.id == product.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this ID already exists")
    
    # Create new product
    new_product = Products(
        id=product.id,
        url=product.url,
        name=product.name,
        category_id=product.category_id,
        description=product.description,
        specs=product.specs,
        images=",".join(product.images) if product.images else None,
        scraped_at=product.scraped_at or datetime.now().isoformat()
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    return new_product

@router.put("/admin/products/{product_id}", response_model=ProductResponse)
@limiter.limit("10/minute")
def update_product(
    request: Request,
    product_id: str,
    product_update: ProductUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update a product"""
    product = db.query(Products).filter(Products.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update fields
    update_data = product_update.model_dump(exclude_unset=True)
    
    # Handle specs conversion if it's a string
    if 'specs' in update_data and isinstance(update_data['specs'], str):
        try:
            update_data['specs'] = json.loads(update_data['specs'])
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in specs field")
    
    # Handle images conversion
    if 'images' in update_data and update_data['images']:
        update_data['images'] = ",".join(update_data['images'])  # Convert list to comma-separated string
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return product

@router.delete("/admin/products/{product_id}")
@limiter.limit("10/minute")
def delete_product(
    request: Request,
    product_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete a product"""
    product = db.query(Products).filter(Products.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}

# ============================================================================
# HEALTH & SYNC ENDPOINTS
# ============================================================================

@router.get("/health/database", response_model=DatabaseHealthResponse)
def get_database_health(db: Session = Depends(get_db)):
    """
    Get database health metrics including product count, category count, and overall health percentage.
    """
    try:
        total_products = db.query(func.count(Products.id)).scalar() or 0
        total_categories = db.query(func.count(Category.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # Calculate health percentage based on data completeness
        # Health = (products with specs + products with images) / total_products * 100
        if total_products > 0:
            products_with_specs = db.query(func.count(Products.id)).filter(Products.specs != None).scalar() or 0
            products_with_images = db.query(func.count(Products.id)).filter(Products.images != None).scalar() or 0
            completeness = ((products_with_specs + products_with_images) / (total_products * 2)) * 100
            health_percentage = int(min(completeness, 100))
        else:
            health_percentage = 0
        
        # Determine status
        if health_percentage >= 80:
            status = "excellent"
        elif health_percentage >= 60:
            status = "good"
        elif health_percentage >= 40:
            status = "fair"
        else:
            status = "poor"
        
        return DatabaseHealthResponse(
            health_percentage=health_percentage,
            total_products=total_products,
            total_categories=total_categories,
            total_users=total_users,
            status=status
        )
    except Exception as e:
        logger.error(f"Error calculating database health: {str(e)}")
        return DatabaseHealthResponse(
            health_percentage=0,
            total_products=0,
            total_categories=0,
            total_users=0,
            status="poor"
        )

@router.get("/sync/last", response_model=LastSyncResponse)
def get_last_sync(db: Session = Depends(get_db)):
    """
    Get information about the last synchronization including timestamp and product count.
    """
    try:
        # Get the most recent product in the database
        latest_product = db.query(Products).order_by(Products.scraped_at.desc()).first()
        
        if not latest_product:
            return LastSyncResponse(
                last_sync_timestamp="",
                last_sync_formatted="Never synced",
                total_products_synced=0
            )
        
        last_sync_timestamp = latest_product.scraped_at
        
        # Count total products
        total_products = db.query(func.count(Products.id)).scalar() or 0
        
        # Format the timestamp for display
        try:
            # Try to parse ISO format
            from datetime import datetime
            dt = datetime.fromisoformat(last_sync_timestamp.replace('Z', '+00:00'))
            last_sync_formatted = dt.strftime('%d/%m/%Y %H:%M:%S')
        except:
            last_sync_formatted = last_sync_timestamp
        
        return LastSyncResponse(
            last_sync_timestamp=last_sync_timestamp,
            last_sync_formatted=last_sync_formatted,
            total_products_synced=total_products
        )
    except Exception as e:
        logger.error(f"Error retrieving last sync info: {str(e)}")
        return LastSyncResponse(
            last_sync_timestamp="",
            last_sync_formatted="Error retrieving sync info",
            total_products_synced=0
        )

# Test if this file runs directly
if __name__ == "__main__":
    print("This is a router file, not meant to be run directly.")
    print("Run 'python app.py' instead.")