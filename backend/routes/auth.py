# routes/auth.py
from auth.utils import create_access_token, create_refresh_token
from fastapi import APIRouter, HTTPException, status, Depends
from schemas.user import UserCreate, UserResponse, Token
from fastapi.security import OAuth2PasswordRequestForm
from auth.deps import get_current_user  
from crud.user import user_crud
from config import settings
from datetime import timedelta
from typing import Dict, Any
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user
    
    - **email**: must be valid email address
    - **username**: optional, must be alphanumeric
    - **password**: at least 8 chars, with uppercase, lowercase, and digit
    """
    try:
        # Create user
        created_user = await user_crud.create_user(user_data)
        
        if not created_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Remove password from response
        created_user.pop("hashed_password", None)
        
        return {
            "message": "User registered successfully",
            "user": created_user,
            "next_steps": [
                "Check your email for verification (if implemented)",
                "Use /auth/login to get your tokens"
            ]
        }
        
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration"
        )

@router.get("/users/{user_id}", response_model=Dict[str, Any])
async def get_user(user_id: str):
    """Get user by ID (for testing)"""
    try:
        user = await user_crud.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.pop("hashed_password", None)
        
        return {"user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return tokens"""
    user = await user_crud.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create tokens with user ID payload
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user["_id"])}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Add protected route example
@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: Dict = Depends(get_current_user)):
    """Get current authenticated user"""
    # Remove sensitive data
    current_user.pop("hashed_password", None)
    
    # Convert MongoDB _id to id for Pydantic validation
    if "_id" in current_user and "id" not in current_user:
        current_user["id"] = str(current_user["_id"])
        current_user.pop("_id", None)
    
    return current_user