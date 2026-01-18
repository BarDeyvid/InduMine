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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.products import router

app = FastAPI(title="InduMine Modular Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    from database import Base, engine
    # Initial DB Create (safe to run, will only create tables if missing)
    Base.metadata.create_all(bind=engine)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

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

