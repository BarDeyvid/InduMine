import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from jose import JWTError, jwt
from passlib.context import CryptContext

# Import models
from models.products import *
from models.users import User
from database import get_db

# Security Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# JWT Config
SECRET_KEY = "supersecretinduminekey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ============================================================================
# CATEGORY MAPPING CONFIGURATION
# ============================================================================
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
# HELPERS & DEPENDENCIES
# ============================================================================

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

if __name__ == "__main__":
    print("Helper module loaded successfully!")
    print("This module is meant to be imported, not run directly.")
    print("Run 'python app.py' to start the application.")