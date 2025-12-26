# schemas/user.py
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from pydantic.json_schema import JsonSchemaValue
from typing import Optional, Any, Dict, List
from pydantic_core import core_schema
from datetime import datetime
from bson import ObjectId
import json
import re


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Any,
    ) -> core_schema.CoreSchema:
        def validate_from_str(value: str) -> ObjectId:
            try:
                return ObjectId(value)
            except Exception:
                raise ValueError("Invalid ObjectId")

        return core_schema.union_schema([
            # Handle ObjectId instance
            core_schema.is_instance_schema(ObjectId),
            # Handle string
            core_schema.no_info_plain_validator_function(validate_from_str),
            # Handle dict with $oid
            core_schema.dict_schema(
                core_schema.str_schema(),
                core_schema.union_schema([
                    core_schema.str_schema(),
                    core_schema.is_instance_schema(ObjectId),
                ]),
            ),
        ], serialization=core_schema.to_string_ser_schema())

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler
    ) -> JsonSchemaValue:
        return handler(core_schema.str_schema())

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if v and not re.match("^[a-zA-Z0-9_]{3,15}$", v):
            raise ValueError('Username must be 3-15 alphanumeric characters or underscores')
        return v

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[^a-zA-Z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    roles: list[str] = ["user"]
    profile: Dict[str, Any] = {}
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class UserResponse(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    roles: list[str]

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    type: Optional[str] = None