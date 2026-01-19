# ==================== DATABASE.PY ====================
from sqlalchemy.orm import sessionmaker  
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON  
from sqlalchemy.sql import func  
from config import settings  
import logging  

from configuration.products import * 
logger = logging.getLogger(__name__)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base model
Base = declarative_base()

class BaseMixin:
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

# ==================== MODELS.PY ====================
class User(Base):  # Remove BaseMixin
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    role = Column(String(50), default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    allowed_categories = Column(JSON, default=[])
    created_at = Column(Text)  # Add only created_at, not updated_at

class Category(Base, BaseMixin):
    __tablename__ = "categories"
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    photo = Column(String(255), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    allowed_roles = Column(JSON, default=["guest"], nullable=False)
    product_count = Column(Integer, default=0, nullable=False)

class Product(Base, BaseMixin):
    __tablename__ = "products"
    
    original_id = Column(Integer, nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    category_name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    photo = Column(String(255), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    key_features = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    allowed_roles = Column(JSON, default=["guest"], nullable=False)
    popularity = Column(Integer, default=0, nullable=False)
    technical_specs = Column(JSON, nullable=True)
    important_specs = Column(JSON, nullable=True)
    specs_count = Column(Integer, default=0, nullable=False)

class ProductSpec(Base, BaseMixin):
    __tablename__ = "product_specs"
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    value = Column(Text, nullable=False)
    
    __table_args__ = ({"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},)

# ==================== DATABASE HELPER FUNCTIONS ====================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created")

def close_database():
    """Close database connection"""
    engine.dispose()
    logger.info("✅ Database connection closed")