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

from configuration.products import *
from models.products import *
from models.users import *
from schemas.products import *
from utils.helpers import *

# ============================================================================
# CONFIGURATION
# ============================================================================


# ============================================================================
# MODELS (Database Tables)
# ============================================================================



# ============================================================================
# CATEGORY MAPPING CONFIGURATION
# ============================================================================
# This defines the "Universe" of data. We ignore the 'categories' table in SQL
# and use this strict mapping to determine which Python Class handles which Data.

# ============================================================================
# PYDANTIC SCHEMAS (Validation)
# ============================================================================

# ============================================================================
# HELPERS & DEPENDENCIES
# ============================================================================

