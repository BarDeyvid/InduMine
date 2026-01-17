# ==================== DATABASE.PY ====================
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from config import settings
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.mysql_url,
    echo=True,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base model
Base = declarative_base()

class BaseMixin:
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

# ==================== MODELS.PY ====================
class User(Base, BaseMixin):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    roles = Column(JSON, default=["user"], nullable=False)
    profile = Column(JSON, default={}, nullable=False)
    allowed_categories = Column(JSON, default=[], nullable=False)
    full_name = Column(String(100), nullable=True)

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
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get DB session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def create_tables():
    """Create all tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created")

async def close_database():
    """Close database connection"""
    await engine.dispose()
    logger.info("✅ Database connection closed")