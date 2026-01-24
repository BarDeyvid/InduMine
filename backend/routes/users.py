from fastapi import APIRouter, Depends, HTTPException, Query
from utils.security import get_current_user
from models.users import User
from schemas.auth import UserResponse, UserUpdate
from database import get_db
from sqlalchemy.orm import Session
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado pelo token Bearer"""
    return current_user


# ========== ADMIN ENDPOINTS ==========

def check_admin_role(current_user: User = Depends(get_current_user)):
    """Verifica se o usuário tem role de admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem acessar este recurso."
        )
    return current_user


@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(check_admin_role),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    role: str = Query(None),
    db: Session = Depends(get_db)
):
    """Lista todos os usuários. Apenas administradores podem acessar."""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/counts/stats")
async def get_users_stats(
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Retorna estatísticas de usuários"""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_users": admin_users,
        "inactive_users": total_users - active_users
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Obtém detalhes de um usuário específico"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Atualiza dados de um usuário. Apenas administradores podem fazer isso."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)
    
    user.updated_by = current_user.id
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_update: dict,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Atualiza o papel (role) de um usuário"""
    if "role" not in role_update:
        raise HTTPException(status_code=400, detail="Campo 'role' é obrigatório")
    
    role = role_update["role"]
    if role not in ["admin", "user", "moderator"]:
        raise HTTPException(
            status_code=400, 
            detail="Role deve ser 'admin', 'user' ou 'moderator'"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent demoting the last admin
    if user.role == "admin" and role != "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count == 1:
            raise HTTPException(
                status_code=400, 
                detail="Não é possível remover o último administrador"
            )
    
    user.role = role
    user.updated_by = current_user.id
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Papel do usuário atualizado com sucesso", "user": UserResponse.model_validate(user)}


@router.patch("/{user_id}/categories")
async def update_user_categories(
    user_id: int,
    categories_update: dict,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Atualiza as categorias permitidas para um usuário"""
    if "allowed_categories" not in categories_update:
        raise HTTPException(status_code=400, detail="Campo 'allowed_categories' é obrigatório")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.allowed_categories = categories_update["allowed_categories"]
    user.updated_by = current_user.id
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Categorias atualizadas com sucesso", "user": UserResponse.model_validate(user)}


@router.patch("/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    status_update: dict,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Ativa ou desativa um usuário"""
    if "is_active" not in status_update:
        raise HTTPException(status_code=400, detail="Campo 'is_active' é obrigatório")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_active = status_update["is_active"]
    user.updated_by = current_user.id
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": f"Usuário {'ativado' if user.is_active else 'desativado'} com sucesso", "user": UserResponse.model_validate(user)}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(check_admin_role),
    db: Session = Depends(get_db)
):
    """Deleta um usuário. Apenas administradores podem fazer isso."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent deleting the last admin
    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count == 1:
            raise HTTPException(
                status_code=400, 
                detail="Não é possível deletar o último administrador"
            )
    
    db.delete(user)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}