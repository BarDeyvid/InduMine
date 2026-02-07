from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from typing import Any
from config import settings
from database import get_db
from models.users import User

class TokenResponse(BaseModel):
    """Schema for authentication token responses."""
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int

# Token security
security = HTTPBearer(auto_error=False)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt.

    Args:
        password: The raw password string to hash.

    Returns:
        str: The decoded string representation of the hashed password.
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks a plain-text password against a stored hash.

    Args:
        plain_password: The password provided by the user.
        hashed_password: The hash stored in the database.

    Returns:
        bool: True if passwords match, False otherwise.
    """
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    return bcrypt.checkpw(password_byte_enc, hashed_password_bytes)

def create_tokens(username: str, role: str) -> Tuple[str, str]:
    """
    Generates a pair of JWT access and refresh tokens.

    Args:
        username: The unique identifier (subject) for the token.
        role: The user's assigned role for RBAC.

    Returns:
        Tuple[str, str]: A tuple containing (access_token, refresh_token).
    """
    access_expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    refresh_expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    
    access_payload: dict[str, str | datetime] = {
        "sub": username,
        "role": role,
        "type": "access",
        "exp": access_expire
    }
    
    refresh_payload: dict[str, str | datetime] = {
        "sub": username,
        "type": "refresh",
        "exp": refresh_expire
    }
    
    access_token = jwt.encode(
        access_payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    refresh_token = jwt.encode(
        refresh_payload,
        settings.REFRESH_SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return access_token, refresh_token

def verify_token(token: str, token_type: str = "access") -> dict[Any, Any]:
    """
    Decodes and validates a JWT token.

    Args:
        token: The encoded JWT string.
        token_type: Expected type of token ('access' or 'refresh').

    Returns:
        Dict[Any, Any]: The decoded payload if valid.

    Raises:
        HTTPException: 401 if token is expired, invalid, or type mismatch.
    """
    try:
        secret = (
            settings.SECRET_KEY 
            if token_type == "access" 
            else settings.REFRESH_SECRET_KEY
        )
        
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.ALGORITHM]
        )
        
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
            
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}"
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to retrieve the user associated with the Bearer token.

    Args:
        credentials: The Bearer token extracted from the Authorization header.
        db: The database session.

    Returns:
        User: The SQLAlchemy User object.

    Raises:
        HTTPException: 401 if credentials missing, user not found, or user inactive.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    payload = verify_token(credentials.credentials)
    username = payload.get("sub")
    
    user = db.query(User).filter(User.username == username).first()
    if not user or user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user

def require_role(required_role: str):
    """
    Factory that returns a dependency for role-based access control.
    
    Admins are granted access by default regardless of the `required_role`.

    Args:
        required_role: The role string required to access the endpoint.

    Returns:
        Callable: A dependency function that checks the user's role.
    """
    def role_checker(user: User = Depends(get_current_user)):
        if str(user.role) != required_role and str(user.role) != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role"
            )
        return user
    return role_checker
