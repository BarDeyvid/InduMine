# ============================================================================
# BACKEND MODELS - PRODUCTS
# ============================================================================
# models/products.py
# ============================================================================

from sqlalchemy import Column, String, Text, JSON, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from database import Base

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    parent_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    
    # Self-referential relationship for parent-child hierarchy
    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent", cascade="all")
    products = relationship("Products", back_populates="category_rel")
    
    __table_args__ = (
        Index('idx_category_parent', 'parent_id'),
    )

class Products(Base):
    __tablename__ = 'products'
    id = Column(String(50), primary_key=True)
    url = Column(Text, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True, index=True)
    description = Column(Text, nullable=True)
    specs = Column(JSON, nullable=True)
    images = Column(Text, nullable=True)
    scraped_at = Column(String(50), nullable=False, index=True)
    
    # Relationship to Category
    category_rel = relationship("Category", back_populates="products")
    
    __table_args__ = (
        Index('idx_product_category', 'category_id'),
        Index('idx_product_name', 'name'),
        Index('idx_product_scraped_at', 'scraped_at'),
    )