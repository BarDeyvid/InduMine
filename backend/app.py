import os
import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean, JSON, 
    inspect, or_, text
)
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import JWTError, jwt

from models.products import *
from models.users import *
from schemas.products import *

# ============================================================================
# CONFIGURATION
# ============================================================================

# Database Config
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Mv1208811#")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "indumine_db")
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?charset=utf8mb4"

# JWT Config (Change SECRET_KEY in production!)
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretinduminekey123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQLAlchemy Setup
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ============================================================================
# MODELS (Database Tables)
# ============================================================================



# ============================================================================
# CATEGORY MAPPING CONFIGURATION
# ============================================================================
# This defines the "Universe" of data. We ignore the 'categories' table in SQL
# and use this strict mapping to determine which Python Class handles which Data.

CATEGORY_CONFIG = {
    "building-infrastructure": {
        "model": BuildingInfrastructure,
        "name": "Building Infrastructure"
    },
    "coatings-and-varnishes": {
        "model": CoatingsAndVarnishes,
        "name": "Coatings & Varnishes"
    },
    "critical-power": {
        "model": CriticalPower,
        "name": "Critical Power"
    },
    "digital-solutions": {
        "model": DigitalSolutions,
        "name": "Digital Solutions"
    },
    "digital-solutions-and-smart-grid": {
        "model": DigitalSolutionsSmartGrid,
        "name": "Digital Solutions & Smart Grid"
    },
    "electric-motors": {
        "model": ElectricMotors,
        "name": "Electric Motors"
    },
    "generation-transmission": {
        "model": GenerationTransmission,
        "name": "Generation, Transmission & Distribution"
    },
    "industrial-automation": {
        "model": IndustrialAutomation,
        "name": "Industrial Automation"
    },
    "safety-sensors": {
        "model": SafetySensors,
        "name": "Safety, Sensors & Power Supply"
    }
}

# ============================================================================
# PYDANTIC SCHEMAS (Validation)
# ============================================================================

# ============================================================================
# HELPERS & DEPENDENCIES
# ============================================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def row_to_dict(instance):
    """Converts a SQLAlchemy row to a standardized dict with 'specifications'."""
    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}
    
    # Extract standard fields
    base = {
        "product_code": data.get("product_code", "N/A"),
        "image": data.get("product_image"),
        "url": data.get("product_url"),
        "category": data.get("category_name"),
        "specifications": {}
    }
    
    # Move everything else to specifications
    for key, val in data.items():
        if key not in ["product_code", "product_image", "product_url", "category_name"]:
            if val: # Only include non-empty values
                base["specifications"][key] = val
                
    return base

# ============================================================================
# API ENDPOINTS
# ============================================================================

app = FastAPI(title="InduMine Modular Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTHENTICATION ---

@app.post("/auth/register", response_model=UserResponse)
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

@app.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- USER MANAGEMENT ---

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.patch("/users/me", response_model=UserResponse)
def update_user_me(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Allow user to update their own details"""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.email is not None:
        current_user.email = user_update.email
    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)
    
    # Only Admins should theoretically update allowed_categories, but for this demo logic:
    if user_update.allowed_categories is not None:
         current_user.allowed_categories = user_update.allowed_categories

    db.commit()
    db.refresh(current_user)
    return current_user

# --- DATA / CATEGORIES ---

@app.get("/categories", response_model=List[CategorySummary])
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

@app.get("/products/{category_slug}", response_model=List[ProductItemResponse])
def get_products_by_category(
    category_slug: str, 
    limit: int = 50, 
    offset: int = 0,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Loads data ONLY from the table corresponding to the requested category.
    Verifies user permission first.
    """
    # 1. Security Check
    user_access_list = current_user.allowed_categories or []
    if category_slug not in user_access_list and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not have access to this category data.")
    
    # 2. Get the Model
    config = CATEGORY_CONFIG.get(category_slug)
    if not config:
        raise HTTPException(status_code=404, detail="Category table definition not found.")
    
    model = config["model"]
    
    # 3. Query the specific table
    try:
        products = db.query(model).offset(offset).limit(limit).all()
    except Exception as e:
        logger.error(f"Database error querying {category_slug}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving data from category table")

    # 4. Serialize (Handle heterogeneous columns)
    return [row_to_dict(p) for p in products]

@app.get("/products/{category_slug}/{product_code}", response_model=ProductItemResponse)
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
         
    return row_to_dict(product)

if __name__ == "__main__":
    import uvicorn
    # Initial DB Create (safe to run, will only create tables if missing)
    Base.metadata.create_all(bind=engine)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)