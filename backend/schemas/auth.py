from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List
import re

class PasswordMixin:
    """Password validation mixin"""
    
    @field_validator('password')
    @classmethod
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
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []
    # Note: role field removed from public registration

class UserCreateAdmin(BaseModel):
    """Admin-only user creation schema with role field"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []
    role: str = Field("user", pattern="^(admin|user|moderator)$")

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    allowed_categories: Optional[List[str]] = None
    is_active: Optional[bool] = None

from datetime import datetime  # Add this import

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    allowed_categories: List[str]
    is_active: bool
    # Change these from Optional[str] to Optional[datetime]
    created_at: Optional[datetime] = None 
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str