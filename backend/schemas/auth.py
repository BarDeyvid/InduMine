from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
import re

class PasswordMixin:
    """
    A mixin to provide standardized password validation across multiple schemas.
    """

    @field_validator('password', 'new_password', check_fields=False)
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validates that the password meets complexity requirements.

        Args:
            v (str): The raw password string.

        Raises:
            ValueError: If password is < 8 chars, or lacks uppercase, lowercase, or digits.

        Returns:
            str: The validated password.
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserCreate(BaseModel, PasswordMixin):
    """
    Schema for standard user registration.
    """
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []

class UserCreateAdmin(BaseModel, PasswordMixin):
    """
    Schema for administrative user creation, allowing role assignment.
    """
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    allowed_categories: List[str] = []
    role: str = Field("user", pattern="^(admin|user|moderator)$")

class UserUpdate(BaseModel, PasswordMixin):
    """
    Schema for updating existing user profiles. All fields are optional.
    """
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    allowed_categories: Optional[List[str]] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    """
    Schema for public user data returned by the API. 
    Excludes sensitive fields like passwords.
    """
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    allowed_categories: List[str]
    is_active: bool
    created_at: Optional[datetime] = None 
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    """
    Schema for basic OAuth2-compatible access tokens.
    """
    access_token: str
    token_type: str

class TokenResponse(BaseModel):
    """
    Comprehensive token response including a refresh token and expiration time.
    """
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

class LoginRequest(BaseModel):
    """
    Credentials required for user authentication.
    """
    username: str
    password: str

class PasswordChangeRequest(BaseModel, PasswordMixin):
    """
    Schema for authenticated users to update their password.
    """
    current_password: str
    new_password: str