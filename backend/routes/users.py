from fastapi import APIRouter, Depends
from utils.security import get_current_user
from models.users import User
from schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado pelo token Bearer"""
    return current_user