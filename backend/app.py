import os
import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

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

# ============================================================================
# CONFIGURATION
# ============================================================================

# Database Config
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Echidna12")
DB_HOST = os.getenv("DB_HOST", "db")
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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="user") # admin, user, guest
    is_active = Column(Boolean, default=True)
    # Stores list of slugs user can access: ["electric-motors", "industrial-automation"]
    allowed_categories = Column(JSON, default=list) 
    created_at = Column(Text) # Using Text to avoid datetime parsing issues with legacy data if any

# --- Product Table Models (Specific to your SQL Dump) ---
# We use a Mixin for columns that appear often, but map specific columns manually.

class ProductMixin:
    """Common fields found across most tables"""
    # Using specific Column names from your SQL dump (often with spaces)
    product_url = Column("Product URL", Text)
    # We use Product Code as a pseudo-PK for fetching details, though tables lack explicit PKs sometimes
    product_code = Column("Product Code", String(255), primary_key=True) 
    product_image = Column("Product Image", Text)
    category_name = Column("Category", Text)

# 1. Building Infrastructure
class BuildingInfrastructure(Base, ProductMixin):
    __tablename__ = "building_infrastructure"
    model = Column("Model", Text)
    rated_current = Column("Rated current, [In]", Text)

# 2. Coatings
class CoatingsAndVarnishes(Base, ProductMixin):
    __tablename__ = "coatings_and_varnishes"
    color = Column("Color", Text)
    function = Column("Function", Text)
    application = Column("Application Surface", Text)

# 3. Critical Power
class CriticalPower(Base, ProductMixin):
    __tablename__ = "critical_power"
    rated_power = Column("Rated Power", Text)
    input_voltage = Column("Input voltage", Text)

# 4. Digital Solutions
class DigitalSolutions(Base, ProductMixin):
    __tablename__ = "digital_solutions"
    type = Column("Type", Text)
    voltage = Column("Power supply voltage", Text)

# 5. Smart Grid
class DigitalSolutionsSmartGrid(Base, ProductMixin):
    __tablename__ = "digital_solutions_and_smart_grid"
    application = Column("Application", Text)
    asset = Column("Asset", Text)

# 6. Electric Motors
class ElectricMotors(Base, ProductMixin):
    __tablename__ = "electric_motors"
    frame = Column("Frame", Text)
    poles = Column("Number of Poles", Text)
    output = Column("Output", Text)
    voltage = Column("Voltage", Text)
    efficiency = Column("Efficiency @ 100%", Text)

# 7. Generation & Transmission
class GenerationTransmission(Base, ProductMixin):
    __tablename__ = "generation_transmission_and_distribution"
    power = Column("Power", Text)
    hv_voltage = Column("HV rated voltage", Text)

# 8. Industrial Automation
class IndustrialAutomation(Base, ProductMixin):
    __tablename__ = "industrial_automation"
    supply_voltage = Column("Supply voltage", Text)
    current = Column("RATED CURRENT", Text)

# 9. Safety Sensors
class SafetySensors(Base, ProductMixin):
    __tablename__ = "safety_industrial_sensors_and_power_supply"
    supply_voltage = Column("Supply voltage", Text)
    output_type = Column("Output type", Text)

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

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    # Allowed categories can be passed on creation, or defaulted to []
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

    class Config:
        from_attributes = True

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

def row_to_dict(instance, slug=None):
    """Converts a SQLAlchemy row to a standardized dict with 'specifications'."""
    if instance is None:
        return None
    data = {c.key: getattr(instance, c.key) for c in inspect(instance).mapper.column_attrs}
    
    base = {
        "product_code": data.get("product_code", "N/A"),
        "image": data.get("product_image"),
        "url": data.get("product_url"),
        "category_slug": slug, 
        "specifications": {}
    }
    
    # Move everything else to specifications
    for key, val in data.items():
        if key not in ["product_code", "product_image", "product_url", "category_name"]:
            if val: 
                base["specifications"][key] = val
                
    return base

# ============================================================================
# API ENDPOINTS
# ============================================================================

app = FastAPI(title="InduMine Modular Backend")

origins = [
    "http://localhost",
    "http://localhost:80",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos os headers
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

@app.get("/products/code/{product_code}", response_model=ProductItemResponse)
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

@app.get("/products/{category_slug}", response_model=List[ProductItemResponse])
def get_products_by_category(category_slug: str, db: Session = Depends(get_db)):
    config = CATEGORY_CONFIG.get(category_slug)
    if not config:
        raise HTTPException(status_code=404, detail="Categoria não configurada no backend")

    model = config["model"]
    
    # Adicionando um filtro para evitar linhas corrompidas/vazias
    products = db.query(model).all()
    
    # Filtragem robusta antes de converter para dicionário
    valid_products = [row_to_dict(p, slug=category_slug) for p in products if p is not None]
    
    return valid_products

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
         
    return row_to_dict(product, slug=category_slug)

if __name__ == "__main__":
    import uvicorn
    # Initial DB Create (safe to run, will only create tables if missing)
    Base.metadata.create_all(bind=engine)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)