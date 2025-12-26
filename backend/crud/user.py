# crud/user.py
from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timezone
from app.auth.utils import get_password_hash, verify_password
from app.schemas.user import UserCreate
from app.models.user import UserModel
import logging
import re

logger = logging.getLogger(__name__)

class UserCRUD:
    def __init__(self):
        self._collection = None
    
    @property
    def collection(self):
        """Lazy loading of collection"""
        if self._collection is None:
            from app.database.mongodb import mongodb
            if mongodb.db is None:
                raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
            self._collection = mongodb.db.users
        return self._collection
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            user = await self.collection.find_one({"email": email})
            if user and '_id' in user:
                user['_id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        try:
            user = await self.collection.find_one({"username": username})
            if user and '_id' in user:
                user['_id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"Error getting user by username: {e}")
            return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user and '_id' in user:
                user['_id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None

    async def authenticate_user(self, identifier: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user by email OR username"""
        user = await self.get_user_by_email(identifier)
        if not user:
            user = await self.get_user_by_username(identifier)
        
        if not user or not user.get("is_active"):
            return None
            
        if verify_password(password, user["hashed_password"]):
            return user
        return None

    @staticmethod
    def _generate_unique_username(base: str) -> str:
        """Generate unique username with fallback mechanism"""
        base = re.sub(r'[^a-zA-Z0-9]', '', base).lower()
        if not base:
            base = "user"
        return base

    async def create_user(self, user_data: UserCreate) -> Optional[Dict[str, Any]]:
        try:
            # Check email uniqueness
            if await self.get_user_by_email(user_data.email):
                raise ValueError("Email already registered")
            
            # Handle username
            username = user_data.username
            if username:
                if await self.get_user_by_username(username):
                    raise ValueError("Username already taken")
            else:
                # Generate safe username from email prefix
                base_username = self._generate_unique_username(user_data.email.split('@')[0])
                username = base_username
                
                # Ensure uniqueness for generated usernames
                counter = 1
                while await self.get_user_by_username(username):
                    username = f"{base_username}{counter}"
                    counter += 1
                    if counter > 100:  # Safety net
                        raise ValueError("Could not generate unique username")

            # Hash password
            hashed_password = get_password_hash(user_data.password)
            
            # Create user document with UTC timestamps
            now = datetime.now(timezone.utc)
            user_dict = {
                **UserModel.user_dict(
                    email=user_data.email,
                    hashed_password=hashed_password,
                    username=username
                ),
                "created_at": now,
                "updated_at": now
            }
            
            # Insert into MongoDB
            result = await self.collection.insert_one(user_dict)
            created_user = await self.collection.find_one({"_id": result.inserted_id})
            
            # Convert ObjectId to string
            if created_user:
                created_user["_id"] = str(created_user["_id"])
            return created_user
            
        except ValueError as ve:
            logger.warning(f"Validation error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"User creation failed: {str(e)}", exc_info=True)
            raise Exception("Internal server error during user creation") from e

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        """Update user data"""
        try:
            update_data["updated_at"] = datetime.utcnow()
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return False

    async def delete_user(self, user_id: str) -> bool:
        """Delete a user (soft delete by setting is_active=False)"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

# Create a singleton instance
user_crud = UserCRUD()