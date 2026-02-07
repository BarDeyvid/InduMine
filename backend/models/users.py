from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    """User Table Model

    Args:
        Base (declarative_base): The SQLAlchemy declarative base class.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="user", nullable=False)
    is_active = Column(Boolean, default=True)
    allowed_categories = Column(JSON, default=list)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Audit fields
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    
    def has_access_to_category(self, category_slug: str) -> bool:
        """Check if the user has access to the requested category

        Args:
            category_slug (str): The category slug to check access for.

        Returns:
            bool: True if the user has access to the category, False otherwise.
        """
        if str(self.role) == "admin":
            return True
        return category_slug in self.allowed_categories