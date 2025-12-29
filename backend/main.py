# main.py - Integrated FastAPI application with MongoDB authentication and data endpoints
from database.mongodb import connect_to_mongo, close_mongo_connection
from fastapi import FastAPI, Query, HTTPException, status, Depends, Header, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from auth.deps import get_current_user, get_current_active_user
from schemas.user import UserResponse, UserCreate, Token, TokenData
from config import settings
from routes import auth
from auth.utils import create_access_token, create_refresh_token
from crud.user import user_crud
from crud.product import product_crud
from crud.category import category_crud
from datetime import timedelta, datetime
import pandas as pd
from typing import List, Dict, Any, Optional
import json
from urllib.parse import unquote
import numpy as np
import math
import os
from database.mongodb import mongodb
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

# Role-based category access mapping
ROLE_CATEGORIES = {
    "admin": ["Electric-Motors", "Coatings And Varnishes", "Critical Power", "Digital Solutions And Smart Grid", "Digital Solutions", "Electric Motors", "Generation,Transmission And Distribution", "Industrial Automation", "Safety, Industrial Sensors And Power Supply"],
    "engineer": ["Electric-Motors", "Industrial Automation", "Digital Solutions"],
    "sales": ["Electric-Motors", "Critical Power", "Safety, Industrial Sensors And Power Supply"],
    "guest": ["Electric-Motors"]
}

# ==============================================
# HELPER FUNCTIONS FOR DATA PROCESSING
# ==============================================

def serialize_mongo_doc(doc):
    """
    Recursively converts MongoDB documents to JSON-friendly format.
    - Converts ObjectId to string
    - Handles nested dicts and lists
    - Renames _id to id
    """
    if doc is None:
        return None
        
    if isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
        
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == '_id':
                new_doc['id'] = str(v)
            elif isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, (dict, list)):
                new_doc[k] = serialize_mongo_doc(v)
            else:
                new_doc[k] = v
        return new_doc
        
    if isinstance(doc, ObjectId):
        return str(doc)
        
    return doc

def extract_id_and_name_from_url(url):
    """Extrai ID e Nome da URL do produto"""
    if not isinstance(url, str):
        return None, "Produto Sem Nome"
    
    try:
        parts = url.split('/p/')
        if len(parts) > 1:
            prod_id = int(parts[1].split('/')[0])
            name_part = parts[0].split('/')[-2] or parts[0].split('/')[-1]
            clean_name = unquote(name_part).replace('-', ' ').strip()
            return prod_id, clean_name
        return None, "Produto Sem Nome"
    except:
        return None, "Produto Sem Nome"

def parse_specs(specs_str):
    """Parse especificações"""
    try:
        if pd.isna(specs_str) or specs_str == '':
            return {}
        if isinstance(specs_str, dict):
            return specs_str
        if isinstance(specs_str, str):
            if specs_str.startswith('{') and specs_str.endswith('}'):
                try:
                    return json.loads(specs_str)
                except:
                    try:
                        return json.loads(specs_str.replace("'", '"'))
                    except:
                        return {"descrição": specs_str}
            return {"informação": specs_str}
        return {}
    except Exception as e:
        logger.error(f"Erro ao parsear specs: {e}")
        return {}

def extract_category(url):
    """Extrai nome da categoria da URL"""
    try:
        if isinstance(url, str) and '/en/' in url:
            parts = url.split('/en/')
            if len(parts) > 1:
                category_part = parts[1].split('/')[0]
                decoded = unquote(category_part)
                formatted = decoded.replace('-', ' ').title()
                return formatted
        return "Sem Categoria"
    except:
        return "Sem Categoria"

def get_user_categories(user_role: str, user_allowed_categories: List[str] = None):
    """Obtém categorias que o usuário pode acessar"""
    if user_allowed_categories and len(user_allowed_categories) > 0:
        return user_allowed_categories
    return ROLE_CATEGORIES.get(user_role, ROLE_CATEGORIES["guest"])

# ==============================================
# FASTAPI APP SETUP
# ==============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    print("🚀 Application starting up with MongoDB...")
    
    # Check if we have data in MongoDB
    try:
        db = mongodb.db
        if db is not None:  # Check against None
            product_count = await db.products.count_documents({})
            category_count = await db.categories.count_documents({})
            print(f"📊 MongoDB stats: {product_count} products, {category_count} categories")
            
            if product_count == 0:
                print("⚠️  No products found in MongoDB. Run the migration script first:")
                print("   python database/migration.py")
        else:
            print("⚠️  MongoDB database not initialized")
    except Exception as e:
        print(f"⚠️  Could not check MongoDB data: {e}")
    
    yield
    # Shutdown
    await close_mongo_connection()
    print("🛑 Application shutting down...")

app = FastAPI(
    title=settings.project_name,
    lifespan=lifespan,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    swagger_ui_parameters={"persistAuthorization": True}
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth.router, prefix=settings.api_v1_prefix)

# Create data router
data_router = APIRouter(prefix="", tags=["data"])

# ==============================================
# DATA ENDPOINTS
# ==============================================

@data_router.get("/")
def root():
    """Endpoint raiz"""
    return {
        "message": "API de Produtos WEG - FastAPI com MongoDB",
        "status": "online",
        "authentication": "JWT com MongoDB",
        "note": "Use Authorization: Bearer <token>"
    }

@data_router.get("/health")
async def health_check():
    """Verifica saúde da API"""
    try:
        db = mongodb.db
        if db is not None:
            product_count = await db.products.count_documents({})
            category_count = await db.categories.count_documents({})
            return {
                "status": "healthy",
                "service": "fastapi-product-service",
                "database": "connected",
                "total_products": product_count,
                "total_categories": category_count
            }
        else:
            return {
                "status": "warning",
                "service": "fastapi-product-service",
                "database": "disconnected"
            }
    except Exception as e:
        return {
            "status": "error",
            "service": "fastapi-product-service",
            "database": "error",
            "error": str(e)
        }

@data_router.get("/handshake")
def handshake():
    """Wake-up endpoint para Render"""
    return {
        "message": "FastAPI Server Woke Up",
        "status": "Ready",
        "database": "MongoDB"
    }

@data_router.get("/public/categories")
async def get_public_categories(limit: int = Query(5, ge=1, le=20)):
    """Endpoint público para categorias"""
    try:
        guest_categories = ROLE_CATEGORIES["guest"]
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        categories = await db.categories.find({
            "name": {"$in": guest_categories},
            "status": "active"
        }).limit(limit).to_list(length=limit)
        
        # Use helper
        categories = serialize_mongo_doc(categories)
        
        return {
            "categories": jsonable_encoder(categories),
            "total": len(categories),
            "note": "Apenas categorias públicas. Faça login para ver mais."
        }
    except Exception as e:
        logger.error(f"Error getting public categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to get categories")

@data_router.get("/public/products")
async def get_public_products(limit: int = Query(5, ge=1, le=20)):
    """Endpoint público para produtos"""
    try:
        guest_categories = ROLE_CATEGORIES["guest"]
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get products
        products = await db.products.find({
            "category_name": {"$in": guest_categories},
            "status": "active"
        }).limit(limit).to_list(length=limit)
        
        # Use helper to clean everything
        products = serialize_mongo_doc(products)
        
        return {
            "products": jsonable_encoder(products),
            "total": len(products),
            "note": "Apenas produtos públicos. Faça login para ver mais."
        }
    except Exception as e:
        logger.error(f"Error getting public products: {e}")
        raise HTTPException(status_code=500, detail="Failed to get products")

@data_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    """Dashboard stats from MongoDB"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get total products accessible to user
        if user_role == "admin":
            product_query = {"status": "active"}
        else:
            product_query = {
                "status": "active",
                "category_name": {"$in": user_categories}
            }
        
        total_products = await db.products.count_documents(product_query)
        
        # Get total categories accessible to user
        if user_role == "admin":
            category_query = {"status": "active"}
        else:
            category_query = {
                "status": "active",
                "name": {"$in": user_categories}
            }
        
        total_categories = await db.categories.count_documents(category_query)
        
        # Get popular categories for this user
        popular_categories = await db.categories.find(
            category_query
        ).sort("product_count", -1).limit(5).to_list(length=5)
        
        # Serialize popular categories
        popular_categories = serialize_mongo_doc(popular_categories)
        
        # Get recent updates (products updated today)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        updates_today = await db.products.count_documents({
            **product_query,
            "updated_at": {"$gte": today}
        })
        
        return {
            "total_products": total_products,
            "total_categories": total_categories,
            "popular_categories": popular_categories,
            "updates_today": updates_today,
            "user_role": user_role,
            "accessible_categories": user_categories,
            "chart_data": {
                "by_category": [
                    {"categoria": cat["name"], "valor": cat.get("product_count", 0)}
                    for cat in popular_categories
                ],
                "weekly_updates": [
                    {"day": day, "updates": int(np.random.randint(1, 10))}
                    for day in ["Seg", "Ter", "Qua", "Qui", "Sex"]
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard stats")

@data_router.get("/categories")
async def get_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List categories from MongoDB"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Build query
        if user_role == "admin":
            query = {"status": "active"}
        else:
            query = {
                "status": "active",
                "name": {"$in": user_categories}
            }
        
        # Add search filter
        if search and search.strip():
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await db.categories.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * limit
        categories = await db.categories.find(
            query
        ).skip(skip).limit(limit).to_list(length=limit)
        
        # Clean data
        categories = serialize_mongo_doc(categories)
        
        return {
            "categories": jsonable_encoder(categories),
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "user_role": user_role,
            "accessible_categories": user_categories
        }
        
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to get categories")

@data_router.get("/categories/{category_id_or_name}")
async def get_category_detail(
    category_id_or_name: str,
    current_user: Dict = Depends(get_current_user)
):
    """Detalhes de uma categoria"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Try to find by ID first
        try:
            category = await db.categories.find_one({
                "_id": ObjectId(category_id_or_name)
            })
        except:
            # If not an ObjectId, try by name
            category = await db.categories.find_one({
                "name": category_id_or_name
            })
        
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada!")
        
        # Check if user has access to this category
        if (user_role != "admin" and 
            category["name"] not in user_categories):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado à categoria '{category['name']}'"
            )
        
        # Serialize the main category object
        category = serialize_mongo_doc(category)
        
        # Get products in this category
        product_query = {
            "category_name": category["name"],
            "status": "active"
        }
        
        # Apply role-based filtering for products
        if user_role != "admin":
            product_query["category_name"] = {"$in": user_categories}
        
        category_products = await db.products.find(
            product_query
        ).limit(50).to_list(length=50)
        
        # Clean products
        category_products = serialize_mongo_doc(category_products)
        
        # Get related categories (same allowed_roles)
        related_categories = await db.categories.find({
            "name": {"$ne": category["name"]},
            "status": "active",
            "$or": [
                {"allowed_roles": user_role},
                {"allowed_roles": "admin"} if user_role == "admin" else {}
            ]
        }).limit(5).to_list(length=5)
        
        # Clean related categories
        related_categories = serialize_mongo_doc(related_categories)
        
        # Create response
        response = {
            **category,
            "product_count": len(category_products),
            "products": category_products,
            "related_categories": related_categories, 
            "user_has_access": True,
            "user_role": user_role
        }

        return jsonable_encoder(response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category detail: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get category details: {str(e)}")

@data_router.get("/products")
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """List products with MongoDB backend"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Build query
        if user_role == "admin":
            query = {"status": "active"}
        else:
            query = {
                "status": "active",
                "category_name": {"$in": user_categories}
            }
        
        # Add category filter
        if category and category.strip():
            query["category_name"] = category.strip()
        
        # Add search filter
        if search and search.strip():
            query["$text"] = {"$search": search}
        
        # Get total count
        total = await db.products.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * limit
        products = await db.products.find(
            query
        ).skip(skip).limit(limit).sort("popularity", -1).to_list(length=limit)
        
        # CLEAN EVERYTHING
        products = serialize_mongo_doc(products)
        
        return {
            "products": jsonable_encoder(products),
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "user_role": user_role,
            "accessible_categories": user_categories
        }
        
    except Exception as e:
        logger.error(f"Error getting products: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to get products")

@data_router.get("/products/{product_id}")
async def get_product_detail(
    product_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get product detail from MongoDB"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get product by ID
        try:
            product = await db.products.find_one({
                "_id": ObjectId(product_id)
            })
        except:
             raise HTTPException(status_code=404, detail="ID de produto inválido!")

        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado!")
        
        # Check if user has access to this product's category
        if (user_role != "admin" and 
            product.get("category_name") not in user_categories):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado ao produto '{product.get('name', '')}'"
            )
        
        # Serialize the main product object immediately to handle ANY nested ObjectId
        product = serialize_mongo_doc(product)
        
        # Get similar products (from same category)
        similar_products = await db.products.find({
            "category_name": product.get("category_name"),
            "_id": {"$ne": ObjectId(product_id)},
            "status": "active"
        }).limit(3).to_list(length=3)
        
        # Serialize similar products
        similar_products = serialize_mongo_doc(similar_products)
        
        # Track popularity (increment view count)
        try:
            await db.products.update_one(
                {"_id": ObjectId(product_id)},
                {"$inc": {"popularity": 1}}
            )
        except:
            pass # Ignore popularity update errors
        
        response = product.copy()
        response["related_products"] = similar_products
        response["user_has_access"] = True
        response["user_role"] = user_role
        
        return jsonable_encoder(response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product detail: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to get product details")

@data_router.get("/items")
async def get_items(
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """Busca geral de items (produtos e categorias)"""
    # If no current_user (public access), use guest role
    if current_user is None:
        user_role = "guest"
        user_categories = ROLE_CATEGORIES["guest"]
    else:
        user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
        user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        results = {
            "products": [],
            "categories": [],
            "query": search,
            "user_role": user_role
        }
        
        if search and search.strip():
            search_lower = search.lower().strip()
            
            # Search products
            product_query = {
                "status": "active",
                "$or": [
                    {"name": {"$regex": search_lower, "$options": "i"}},
                    {"description": {"$regex": search_lower, "$options": "i"}}
                ]
            }
            
            # Apply role-based filtering
            if user_role != "admin":
                product_query["category_name"] = {"$in": user_categories}
            
            product_results = await db.products.find(
                product_query
            ).limit(limit).to_list(length=limit)
            
            # Clean product results
            product_results = serialize_mongo_doc(product_results)
            
            for product in product_results:
                results["products"].append({
                    "id": product["id"],
                    "name": product["name"],
                    "description": product.get("description", ""),
                    "category": product.get("category_name", ""),
                    "type": "product",
                    "photo": product.get("photo", "")
                })
            
            # Search categories
            category_query = {
                "status": "active",
                "$or": [
                    {"name": {"$regex": search_lower, "$options": "i"}},
                    {"description": {"$regex": search_lower, "$options": "i"}}
                ]
            }
            
            # Apply role-based filtering
            if user_role != "admin":
                category_query["name"] = {"$in": user_categories}
            
            category_results = await db.categories.find(
                category_query
            ).limit(limit).to_list(length=limit)
            
            # Clean category results
            category_results = serialize_mongo_doc(category_results)
            
            for category in category_results:
                results["categories"].append({
                    "id": category["id"],
                    "name": category["name"],
                    "description": category.get("description", ""),
                    "type": "category",
                    "photo": category.get("photo", ""),
                    "product_count": category.get("product_count", 0)
                })
        
        return results
        
    except Exception as e:
        logger.error(f"Error searching items: {e}")
        raise HTTPException(status_code=500, detail="Failed to search items")

@data_router.get("/sample")
async def get_sample_data(
    n: int = Query(5, ge=1, le=100),
    current_user: Dict = Depends(get_current_user)
):
    """Amostra de dados processados"""
    user_role = current_user.get("roles", ["user"])[0] if current_user.get("roles") else "user"
    user_categories = get_user_categories(user_role, current_user.get("allowed_categories", []))
    
    try:
        db = mongodb.db
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Build query
        if user_role == "admin":
            query = {"status": "active"}
        else:
            query = {
                "status": "active",
                "category_name": {"$in": user_categories}
            }
        
        sample_data = await db.products.find(
            query
        ).limit(n).to_list(length=n)
        
        # Clean sample data
        sample_data = serialize_mongo_doc(sample_data)
        
        # Get total count for accessible products
        total_accessible = await db.products.count_documents(query)
        
        return {
            "sample": jsonable_encoder(sample_data),
            "user_role": user_role,
            "total_accessible_products": total_accessible
        }
        
    except Exception as e:
        logger.error(f"Error getting sample data: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sample data")

@data_router.get("/config")
async def get_config():
    """Retorna configuração da API"""
    try:
        db = mongodb.db
        
        if db is not None:
            product_count = await db.products.count_documents({})
            category_count = await db.categories.count_documents({})
            data_status = "loaded" if product_count > 0 else "empty"
        else:
            data_status = "disconnected"
        
        return {
            "service": "weg-product-api",
            "authentication": "jwt-fastapi-mongodb",
            "data_status": data_status,
            "api_version": "1.0"
        }
    except Exception as e:
        return {
            "service": "weg-product-api",
            "authentication": "jwt-fastapi-mongodb",
            "data_status": "error",
            "error": str(e)
        }

# Include the data router with the API v1 prefix
app.include_router(data_router, prefix=settings.api_v1_prefix)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to WEG Product API with MongoDB Authentication",
        "status": "healthy",
        "docs": f"{settings.api_v1_prefix}/docs"
    }

@app.get("/health")
async def health_check():
    try:
        if mongodb.db is not None:  
            await mongodb.db.command("ping")
            return {"status": "healthy", "database": "connected"}
        else:
            return {"status": "warning", "database": "disconnected"}
    except Exception as e:
        return {"status": "error", "database": "error", "error": str(e)}

@app.get(f"{settings.api_v1_prefix}/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    if "_id" in current_user:
        current_user["id"] = str(current_user["_id"])
        current_user.pop("hashed_password", None)
    
    return current_user

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)