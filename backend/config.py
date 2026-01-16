# ==================== CONFIG.PY ====================
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # MySQL Configuration
    mysql_host: str = os.getenv("MYSQL_HOST", "localhost")
    mysql_port: int = int(os.getenv("MYSQL_PORT", 3306))
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "indumine_db")
    
    # MySQL Connection URL
    mysql_url: Optional[str] = None
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.mysql_url = (
            f"mysql+aiomysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )
    
    # JWT Configuration
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # App Configuration
    project_name: str = "WEG Product API - MySQL"
    api_v1_prefix: str = "/api/v1"
    
    class Config:
        env_file = ".env"

settings = Settings()