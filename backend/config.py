# config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # MongoDB
    mongodb_url: str
    mongodb_db_name: str
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # App
    api_v1_prefix: str = "/api/v1"
    project_name: str = "FastAPI Auth"
    
    class Config:
        env_file = ".env"

settings = Settings()