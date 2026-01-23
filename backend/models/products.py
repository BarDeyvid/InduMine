# ============================================================================
# BACKEND MODELS - PRODUCTS
# ============================================================================
# models/products.py
# ============================================================================

from sqlalchemy import Column, String, Text, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    products = relationship("Products", back_populates="category_rel")

class Products(Base):
    __tablename__ = 'products'
    id = Column(String(50), primary_key=True) # ID vindo do crawler
    url = Column(Text, nullable=False)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True) # Link por ID
    description = Column(Text, nullable=True)
    specs = Column(JSON, nullable=True) # Armazenado como JSON
    images = Column(Text, nullable=True)
    scraped_at = Column(String(50), nullable=False)
    
    category_rel = relationship("Category", back_populates="products")