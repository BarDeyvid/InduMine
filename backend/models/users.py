import os, sys
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean, JSON, 
    inspect, or_, text
)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}  # Add this line
    
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