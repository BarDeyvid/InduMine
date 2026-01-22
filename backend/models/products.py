# ============================================================================
# BACKEND MODELS - PRODUCTS
# ============================================================================
# models/products.py
# ============================================================================

from sqlalchemy import JSON, Column, String, Text
from database import Base


class Products(Base):
    __tablename__ = 'products'

    id = Column(String(50), primary_key=True)
    url = Column(Text, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(JSON, nullable=True)
    specs = Column(Text, nullable=True)
    images = Column(Text, nullable=True)
    scraped_at = Column(String(50), nullable=False)