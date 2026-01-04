# config.py
import sys
from pydantic import ValidationError
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

try:
    settings = Settings()
except ValidationError as e:
    print("\n" + "="*50)
    print("CONFIGURATION ERROR")
    print("="*50)
    print("Missing or invalid environment variables in your .env file:")
    for error in e.errors():
        print(f"  - {error['loc'][0]}: {error['msg']}")
    print("\nFIX: Check your .env file or system environment variables.")
    print("="*50 + "\n")
    sys.exit(1)