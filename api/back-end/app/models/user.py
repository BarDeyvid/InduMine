# models/user.py
from datetime import datetime
from typing import Dict, Any

class UserModel:
    @staticmethod
    def user_dict(email: str, hashed_password: str, username: str = None) -> Dict[str, Any]:
        """Create user dictionary for MongoDB"""
        now = datetime.utcnow()
        return {
            "email": email,
            "username": username or email.split('@')[0],
            "hashed_password": hashed_password,
            "is_active": True,
            "is_verified": False,
            "created_at": now,
            "updated_at": now,
            "roles": ["user"],
            "profile": {
                "full_name": "",
                "avatar_url": None
            }
        }