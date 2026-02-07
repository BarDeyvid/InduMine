# ============================================================================
# BACKEND ROUTES - PRODUCTS
# ============================================================================
# routes/products.py
# ============================================================================

import sys
import os
import json
import logging
from typing import List, cast, Any, Optional, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, HTTPException, Depends, Query, Body, Request
from datetime import datetime
from sqlalchemy import or_, func, select
from sqlalchemy.orm import Session, aliased, selectinload
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel

# Internal Imports
from database import get_db
from schemas.products import * 
from schemas.auth import *
from models.users import User
from models.products import Category, Products
from utils.helpers import get_translator, row_to_dict
from utils.cache import clear_cache, get_cached_category_tree, cache_category_tree
from config import settings
from utils.security import *

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="")

# ============================================================================
# HELPER MODELS & FUNCTIONS
# ============================================================================

class CategoryTreeNode(BaseModel):
    id: int
    name: str
    slug: str
    item_quantity: int
    children: List["CategoryTreeNode"] = []
    
def get_category_descendants(
    db: Session, 
    category_slug: str, 
    include_all_occurrences: bool = False
) -> List[int]:
    """Get descendant IDs recursively for a category slug.

    Args:
        db (Session):
        category_slug (str): Raw category name
        include_all_occurrences (bool, optional): If True, it pulls the whole family tree. Defaults to False.

    Returns:
        List[int]: A list of integers representing category IDs.
    """
    # 1. Get the starting IDs using select()
    base_stmt = select(Category.id).where(Category.slug == category_slug)
    
    start_ids: List[int] = []
    
    if not include_all_occurrences:
        top_level = db.execute(base_stmt.where(Category.parent_id.is_(None))).scalar_one_or_none()
        if top_level is not None:
            start_ids = [top_level]
        else:
            first_cat = db.execute(base_stmt).scalar_one_or_none()
            if first_cat is not None:
                start_ids = [first_cat]
    else:
        # Explicitly cast result to list of ints
        start_ids = [id_val for id_val in db.execute(base_stmt).scalars().all()]

    if not start_ids:
        return []

    # 2. Define the Recursive CTE
    # Initial Part (Anchor)
    hierarchy_cte = (
        select(Category.id)
        .where(Category.id.in_(start_ids))
        .cte(name='category_hierarchy', recursive=True)
    )

    # Recursive Part
    child_alias = aliased(Category)
    recursive_part = select(child_alias.id).join(
        hierarchy_cte, child_alias.parent_id == hierarchy_cte.c.id
    )

    # Union them together
    hierarchy_cte = hierarchy_cte.union_all(recursive_part)
    
    # 3. Final Execution
    # Type cast the scalars to ints
    results = db.execute(select(hierarchy_cte.c.id)).scalars().all()
    return [r for r in results]

def has_access_to_category(user: User, category_slug: str, db: Session) -> bool:
    """Check if user has access to a specific category or any of its ancestors

    Args:
        user (User): The targeted users
        category_slug (str): Which category is requested
        db (Session): 

    Returns:
        bool: True if has access, False otherwise
    """
    if str(user.role) == "admin":
        return True
    
    # Get the category by slug
    category = db.query(Category).filter(Category.slug == category_slug).first()
    if not category:
        return False
    
    # Check the allowed_categories list for the category and all its ancestors
    current_category: Optional[Category] = category
    while current_category:
        allowed_cats = user.allowed_categories or []
        if current_category.slug in allowed_cats:
            return True
        current_category = current_category.parent
    
    return False


# ============================================================================
# AUTH ROUTES
# ============================================================================

@router.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> User:
    """Register the User

    Args:
        user (UserCreate): Input Data in the UserCreate format
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: If email or username already exists, it excepts the code

    Returns:
        User: New user
    """
    db_user = db.query(User).filter(or_(User.email == user.email, User.username == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email or Username already registered")

    hashed_pw = get_password_hash(user.password)

    # New users start with no category access until an admin assigns allowed_categories.
    categories_to_assign = user.allowed_categories if user.allowed_categories else []

    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_pw,
        full_name=user.full_name,
        allowed_categories=categories_to_assign,
        role="user",
        is_active=True,
        created_at=datetime.now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> TokenResponse:
    """Login Method for User

    Args:
        form_data (OAuth2PasswordRequestForm, optional): Defaults to Depends().
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 401 If User doesn't exist on database
        HTTPException: 401 If password is wrong

    Returns:
        TokenResponse: User Authenticated Token Used for Protected Endpoints
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Prevent timing attacks
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(form_data.password, str(user.hashed_password)):
        # Log failed attempt
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Update last login
    user.last_login = cast(Any, datetime.now())
    db.commit()
    
    # Create tokens
    access_token, refresh_token = create_tokens(str(user.username), str(user.role))
    
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
) -> TokenResponse:
    """Refresh access token using refresh token

    Args:
        refresh_token (str, optional): User's Refresh Token. Defaults to Body(..., embed=True).
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 401 If user is invalid

    Returns:
        TokenResponse: New Acess Token
    """
    payload = verify_token(refresh_token, "refresh")
    username = payload.get("sub")
    
    user = db.query(User).filter(User.username == username).first()
    if not user or user.is_active is False:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    new_access_token, _ = create_tokens(str(user.username), str(user.role))
    
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
) -> TokenResponse:
    """Alternative Login Method for User using JSON

    Args:
        login_data (LoginRequest): _description_
        db (Session, optional): _description_. Defaults to Depends(get_db).

    Raises:
        HTTPException: 401 If User doesn't exist
        HTTPException: 401 If Password is wrong

    Returns:
        TokenResponse: User Authenticated Token Used for Protected Endpoints
    """
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    if not verify_password(login_data.password, str(user.hashed_password)):
        logger.warning(f"Failed login attempt for user: {login_data.username}")
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Update last login
    user.last_login = cast(Any, datetime.now())
    db.commit()
    
    # Create tokens
    access_token, refresh_token = create_tokens(str(user.username), str(user.role))
    
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
) -> Dict[str, str]:
    """Allow users to change their own password

    Args:
        password_data (PasswordChangeRequest): New Requested Password
        current_user (User, optional): Defaults to Depends(get_current_user).
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 401 If password is incorrect

    Returns:
        Dict[str, str]: Returns Status for notify
    """
    # Verify current password
    if not verify_password(password_data.current_password, str(current_user.hashed_password)):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )
    
    # Update to new password
    current_user.hashed_password = get_password_hash(password_data.new_password)  # type: ignore
    db.commit()
    
    logger.info(f"User {current_user.username} changed their password")
    
    return {"message": "Password changed successfully"}

@router.get("/auth/check-username/{username}")
def check_username_availability(
    username: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Check if a username is available (public endpoint)

    Args:
        username (str): Requested Username
        db (Session, optional): Defaults to Depends(get_db).

    Returns:
        Dict[str, Any]: True if Yes, False otherwise
    """
    existing = db.query(User).filter(User.username == username).first()
    
    return {
        "username": username,
        "available": existing is None
    }

@router.get("/auth/check-email/{email}")
def check_email_availability(
    email: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Check if an email is available (public endpoint)

    Args:
        email (str): Requested Email
        db (Session, optional): Defaults to Depends(get_db).

    Returns:
        Dict[str, Any]: True if Yes, False otherwise
    """
    existing = db.query(User).filter(User.email == email).first()
    
    return {
        "email": email,
        "available": existing is None
    }

# ============================================================================
# PRODUCT ROUTES
# ============================================================================

@router.get("/products/{category_slug}", response_model=List[ProductItemResponse])
def get_products_by_category(
    category_slug: str, 
    db: Session = Depends(get_db), 
    lang: str = Query("pb"),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    depth: str = Query("all", description="Category depth: 'direct', 'children', or 'all'")  
) -> List[Dict[str, Any]]:
    """Get products by category with depth control

    Args:
        category_slug (str): Raw Category Name
        db (Session, optional): Defaults to Depends(get_db).
        lang (str, optional): Which language you want the data. Defaults to Query("pb").
        current_user (User, optional): Who's Asking for the data. Defaults to Depends(get_current_user).
        skip (int, optional): Defaults to Query(0, ge=0).
        limit (int, optional): Defaults to Query(50, ge=1, le=100).
        depth (_type_, optional): Defaults to Query("all", description="Category depth: 'direct', 'children', or 'all'").

    Raises:
        HTTPException: 403 If user doesn't have permission for the category
        HTTPException: 404 If not found

    Returns:
        List[Dict[str, Any]]: Returns the list of the products in dict format
    """
    # 1. Access Check
    if not has_access_to_category(current_user, category_slug, db):
        raise HTTPException(status_code=403, detail="Você não tem permissão para esta categoria")
    
    # 2. Find Category
    category = db.query(Category).filter(
        Category.slug == category_slug,
        Category.parent_id == None  # Search top-level first
    ).first()
    
    if not category:
        category = db.query(Category).filter(Category.slug == category_slug).first()
    
    if not category:
        raise HTTPException(status_code=404, detail=f"Categoria '{category_slug}' não encontrada")
    
    # 3. Determine Category IDs
    category_ids: List[int] = []
    if depth == "direct":
        category_ids = [cast(int, category.id)]
    elif depth == "children":
        category_ids = [cast(int, category.id)]
        for child in category.children:
            category_ids.append(child.id)
    else:  # "all"
        category_ids = get_category_descendants(db, category_slug, include_all_occurrences=False)
    
    logger.info(f"Buscando produtos para categoria '{category_slug}' (IDs: {category_ids})")
    
    if not category_ids:
        return []
    
    # 4. Fetch Products (Type cast the list explicitly)
    products: List[Products] = (
        db.query(Products)
        .filter(Products.category_id.in_(category_ids))
        .order_by(Products.name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # 5. Process Results
    for p in products:
        setattr(p, "_response_lang", lang)
    
    logger.info(f"Encontrados {len(products)} produtos para categoria '{category_slug}'")
    
    # Filter out None results from row_to_dict
    result_dicts: List[Dict[str, Any]] = []
    for p in products:
        product_dict = row_to_dict(p)
        if product_dict is not None:
            result_dicts.append(product_dict)
    
    return result_dicts

@router.get("/categories", response_model=List[CategorySummary])
def get_categories(
    db: Session = Depends(get_db), 
    lang: str = Query("pb", description="Language code: en, es, pb"),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get top-level categories with optimized query

    Args:
        db (Session, optional): Defaults to Depends(get_db).
        lang (_type_, optional): Which language you want the data. Defaults to Query("pb", description="Language code: en, es, pb").
        current_user (User, optional): Who's Asking for the data. Defaults to Depends(get_current_user).

    Returns:
        List[Dict[str, Any]]: Returns List of Categories on Dict Format
    """
    cache_key = f"{current_user.id}_{lang}"
    cached = get_cached_category_tree(cache_key)
    if cached:
        return cached # type: ignore
    
    # Build base query
    query = db.query(Category).filter(Category.parent_id.is_(None))
    
    # Apply user filter
    if str(current_user.role) != "admin":
        user_categories: Any = current_user.allowed_categories
        if user_categories is not None and len(user_categories) > 0:
            query = query.filter(Category.slug.in_(user_categories))
        else:
            return []
    
    top_categories: List[Category] = query.all()
    
    translator = get_translator(lang)
    category_list: List[Dict[str, Any]] = []
    
    for cat in top_categories:
        category_ids = get_category_descendants(db, str(cat.slug))
        
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar() or 0
        
        has_children = len(cat.children) > 0
        
        category_list.append({
            "name": translator(str(cat.name or "")),
            "slug": str(cat.slug),
            "item_quantity": count,
            "has_children": has_children
        })
    
    cache_category_tree(cache_key, category_list)
    
    return category_list

@router.get("/categories/tree", response_model=List[CategoryTreeNode])
def get_category_tree(
    db: Session = Depends(get_db), 
    lang: str = Query("pb", description="Language code: en, es, pb"), 
    current_user: User = Depends(get_current_user)
) -> List[CategoryTreeNode]:
    """Get the complete category hierarchy tree

    Args:
        db (Session, optional): Defaults to Depends(get_db).
        lang (_type_, optional): Which language you want the data. Defaults to Query("pb", description="Language code: en, es, pb").
        current_user (User, optional): Who's Asking for the data. Defaults to Depends(get_current_user).

    Returns:
        List[CategoryTreeNode]: Returns the Tree branch of categories
    """
    translator = get_translator(lang)

    def build_tree(category: Category) -> CategoryTreeNode:
        # Get descendant IDs
        category_ids = get_category_descendants(db, str(category.slug))
        
        # Count products in this category tree
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar() or 0

        # Recursively build children
        children_nodes: List[CategoryTreeNode] = []
        
        # Sort children safely
        sorted_children = sorted(category.children, key=lambda x: str(x.name or ""))
        
        for child in sorted_children:
            user_allowed_categories = current_user.allowed_categories or []
            if str(current_user.role) == "admin" or child.slug in user_allowed_categories:
                children_nodes.append(build_tree(child))

        return CategoryTreeNode(
            id=cast(int, category.id),
            name=translator(str(category.name or "")),
            slug=str(category.slug),
            item_quantity=count,
            children=children_nodes
        )
    
    query = db.query(Category).filter(cast(Any, Category.parent_id) == None)
    
    # Apply user filter
    if str(current_user.role) != "admin":
        user_categories: Any = current_user.allowed_categories
        if user_categories is not None and len(user_categories) > 0:
            query = query.filter(Category.slug.in_(user_categories))
        else:
            return []
        
    top_categories: List[Category] = query.all()
    return [build_tree(cat) for cat in sorted(top_categories, key=lambda x: str(x.name or ""))]

@router.get("/categories/{slug}/children")
def get_category_children(
    slug: str, 
    db: Session = Depends(get_db), 
    lang: str = Query("pb"),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get direct children of a category

    Args:
        slug (str): Parent category raw name
        db (Session, optional): Defaults to Depends(get_db).
        lang (str, optional): Which language you want the data. Defaults to Query("pb").
        current_user (User, optional): Who's Asking for the data. Defaults to Depends(get_current_user).

    Raises:
        HTTPException: 403 If user doesn't have access to category/ies
        HTTPException: 404 If not found

    Returns:
        List[Dict[str, Any]]: Returns all of children of parent category
    """
    
    if not has_access_to_category(current_user, slug, db):
        raise HTTPException(status_code=403, detail="Access denied")
    
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    children: List[Dict[str, Any]] = []
    translator = get_translator(lang)
    
    for child in category.children:
        # Get descendant IDs
        category_ids = get_category_descendants(db, str(child.slug))
        
        # Count products
        count = db.query(func.count(Products.id)).filter(
            Products.category_id.in_(category_ids)
        ).scalar() or 0
        
        children.append({
            "id": child.id,
            "name": translator(str(child.name or "")),
            "slug": str(child.slug),
            "item_quantity": count,
            "has_children": len(child.children) > 0
        })
    
    return children

@router.get("/products/code/{product_code}", response_model=ProductItemResponse)
def get_product_globally(
    product_code: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pb", description="Language code: en, es, pb")
) -> Dict[str, Any]:
    """Searches for a product across ALL categories in the single products table.

    Args:
        product_code (str): product id/code
        current_user (User, optional): Who's asking for the data. Defaults to Depends(get_current_user).
        db (Session, optional):Defaults to Depends(get_db).
        lang (_type_, optional): Which language you want the data. Defaults to Query("pb", description="Language code: en, es, pb").

    Raises:
        HTTPException: 404 if Not Found
        HTTPException: 403 if user doesn't have access to the product
        HTTPException: 500 If the Back-end fails on fetching

    Returns:
        Dict[str, Any]: The product on dict format
    """
    # Find the product with category relationship loaded
    product: Optional[Products] = db.query(Products).options(selectinload(Products.category_rel)).filter(Products.id == product_code).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user has access to this product's category
    if product.category_rel and not has_access_to_category(current_user, str(product.category_rel.slug), db):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this product's category"
        )
    
    setattr(product, "_response_lang", lang)
    result = row_to_dict(product, slug=str(product.category_rel.slug) if product.category_rel else None)
    if result is None:
        raise HTTPException(status_code=500, detail="Error processing product data")
    return result

@router.get("/products/{category_slug}/{product_code}", response_model=ProductItemResponse)
def get_product_detail(
    category_slug: str,
    product_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pb", description="Language code: en, es, pb")
) -> Dict[str, Any]:
    """Search for product Specs

    Args:
        category_slug (str): Raw Category name
        product_code (str): Product code
        current_user (User, optional): Who's asking for the data. Defaults to Depends(get_current_user).
        db (Session, optional): Defaults to Depends(get_db).
        lang (_type_, optional): Which language you want the data. Defaults to Query("pb", description="Language code: en, es, pb").

    Raises:
        HTTPException: 403 If user doesn't have access
        HTTPException: 404 If Category not found
        HTTPException: 404 If Product not found on the target category
        HTTPException: 500 If back-end fails to fetch

    Returns:
        Dict[str, Any]: Returns Product Data on Dict
    """
    # 1. Security Check
    if not has_access_to_category(current_user, category_slug, db):
        raise HTTPException(status_code=403, detail="Access denied to this category")
    
    # 2. Get the category tree
    category_ids = get_category_descendants(db, category_slug)
    
    if not category_ids:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 3. Find Product in the category tree with category relationship
    product: Optional[Products] = (
        db.query(Products)
        .options(selectinload(Products.category_rel))
        .filter(
            Products.id == product_code,
            Products.category_id.in_(category_ids)
        )
        .first()
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this category")
        
    setattr(product, "_response_lang", lang)
    result = row_to_dict(product, slug=category_slug)
    if result is None:
        raise HTTPException(status_code=500, detail="Error processing product data")
    return result

"""
Search products across all categories the user has access to.
"""
@router.get("/search", response_model=List[ProductItemResponse])
def search_products(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    lang: str = Query("pb", description="Language code: en, es, pb")
) -> List[Dict[str, Any]]: 
    """Search products across all categories the user has access to.

    Args:
        q (str, optional): User Input. Defaults to Query(..., description="Search query").
        limit (int, optional): Limit of returned products. Defaults to Query(20, ge=1, le=50).
        current_user (User, optional): Who's asking for the data. Defaults to Depends(get_current_user).
        db (Session, optional): Defaults to Depends(get_db).
        lang (_type_, optional): Which language you want the data. Defaults to Query("pb", description="Language code: en, es, pb").

    Returns:
        List[Dict[str, Any]]: Returns the List of products that matches the criteria
    """
    # Get all categories the user has access to
    user_categories = current_user.allowed_categories or []
    
    # Build a list of all accessible category IDs (including descendants)
    accessible_category_ids: set[int] = set()

    for category_slug in user_categories:
        category_ids = get_category_descendants(db, str(category_slug))
        accessible_category_ids.update(category_ids)
    
    # Build query with category relationship
    query = db.query(Products).options(selectinload(Products.category_rel))
    
    if str(current_user.role) != "admin":
        if accessible_category_ids:
            query = query.filter(Products.category_id.in_(accessible_category_ids))
        else:
            # No categories accessible, return empty
            return []
    
    # Add search filters
    search_filter = or_(
        Products.name.ilike(f"%{q}%"),
        Products.id.ilike(f"%{q}%"),
        Products.description.ilike(f"%{q}%")
    )
    query = query.filter(search_filter)
    
    # Execute query
    products: List[Products] = query.order_by(Products.id).limit(limit).all()
    
    for p in products:
        setattr(p, "_response_lang", lang)

    # Convert to response format
    results: List[Dict[str, Any]] = []
    for p in products:
        slug = str(p.category_rel.slug) if p.category_rel else None
        result = row_to_dict(p, slug=slug)
        if result is not None:
            results.append(result)
    
    return results

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.post("/admin/products", response_model=ProductResponse)
@limiter.limit("5/minute") # type: ignore
def create_product(
    request: Request,
    product: ProductCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Products:
    """Admin endpoint to create a new product

    Args:
        request (Request): `deprecated`.
        product (ProductCreate): Product Specs.
        current_user (User, optional): `deprecated`. Defaults to Depends(require_role("admin")).
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 400 If product already exists, use the update endpoint for it.

    Returns:
        Products: The newly made product
    """
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
        images=product.images,
        scraped_at=product.scraped_at or datetime.now().isoformat()
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    clear_cache()
    
    return new_product

@router.put("/admin/products/{product_id}", response_model=ProductResponse)
@limiter.limit("10/minute") # type: ignore
def update_product(
    request: Request,
    product_id: str,
    product_update: ProductUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Products:
    """Admin endpoint to update a product

    Args:
        request (Request): `deprecated`
        product_id (str): Which product is the target
        product_update (ProductUpdate): The new Product Information
        current_user (User, optional): `deprecated` Defaults to Depends(require_role("admin")).
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 404 If product isn't found
        HTTPException: 400 If The specs is invalid

    Returns:
        Products: The Updated product
    """
    product = db.query(Products).filter(Products.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    if 'specs' in update_data and isinstance(update_data['specs'], str):
        try:
            update_data['specs'] = json.loads(update_data['specs'])
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in specs field")
    
    if 'images' in update_data and isinstance(update_data['images'], list):
        images_list = cast(List[str], update_data['images'])
        update_data['images'] = ",".join(images_list)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    clear_cache()
    
    return product

@router.delete("/admin/products/{product_id}")
@limiter.limit("10/minute") # type: ignore
def delete_product(
    request: Request,
    product_id: str,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Admin endpoint to deleta a product

    Args:
        request (Request): `deprecated`
        product_id (str): Which product is the target
        current_user (User, optional): `deprecated`. Defaults to Depends(require_role("admin")).
        db (Session, optional): Defaults to Depends(get_db).

    Raises:
        HTTPException: 404 If product isn't found

    Returns:
        Dict[str, str]: Returns The Function result
    """
    product = db.query(Products).filter(Products.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    clear_cache()
    
    return {"message": "Product deleted successfully"}

# ============================================================================
# HEALTH & SYNC ENDPOINTS
# ============================================================================

@router.get("/health/database", response_model=DatabaseHealthResponse)
def get_database_health(db: Session = Depends(get_db)) -> DatabaseHealthResponse:
    """Get database health metrics including product count, category count, and overall health percentage.

    Args:
        db (Session, optional): Defaults to Depends(get_db).

    Returns:
        `DatabaseHealthResponse`: Returns the health percentage with the total of proudcts, categories, user and `db` status
    """
    try:
        total_products: int = db.query(func.count(Products.id)).scalar() or 0
        total_categories: int = db.query(func.count(Category.id)).scalar() or 0
        total_users: int = db.query(func.count(User.id)).scalar() or 0
        
        # Calculate health percentage based on data completeness
        if total_products > 0:
            products_with_specs = db.query(func.count(Products.id)).filter(Products.specs != None).scalar() or 0
            products_with_images = db.query(func.count(Products.id)).filter(Products.images != None).scalar() or 0
            completeness = ((products_with_specs + products_with_images) / (total_products * 2)) * 100
            health_percentage = int(min(completeness, 100))
        else:
            health_percentage = 0
        
        # Determine status
        status: str = "poor"
        if health_percentage >= 80:
            status = "excellent"
        elif health_percentage >= 60:
            status = "good"
        elif health_percentage >= 40:
            status = "fair"
        
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
    """Get information about the last synchronization including timestamp and product count.

    Args:
        db (Session, optional): Defaults to Depends(get_db).

    Returns:
        `LastSyncResponse`: Returns last time stamp with the total of synced products
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
            dt = datetime.fromisoformat(last_sync_timestamp.replace('Z', '+00:00'))
            last_sync_formatted = dt.strftime('%d/%m/%Y %H:%M:%S')
        except:
            last_sync_formatted = str(last_sync_timestamp)
        
        return LastSyncResponse(
            last_sync_timestamp=str(last_sync_timestamp),
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