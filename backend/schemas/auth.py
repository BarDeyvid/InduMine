from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
import re

class PasswordMixin:
    """Password validation mixin"""
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str
    full_name: Optional[str] = Field(None, max_length=200)
    allowed_categories: List[str] = []
    
    _validate_password = validator('password')(PasswordMixin.validate_password)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    # Only admins can update these
    allowed_categories: Optional[List[str]] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator('password')
    def validate_password_if_present(cls, v):
        if v is not None:
            return PasswordMixin.validate_password(v)
        return v