
# ==================== CONFIG.PY ====================
from pydantic_settings import BaseSettings
from pydantic import computed_field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database Configuration - using the EXACT environment variable names from your .env file
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "Mv1208811#"
    DB_NAME: str = "indumine_db"
    DEBUG: bool = True  # Add this since it's in your environment
    
    # JWT Configuration
    SECRET_KEY: str = "supersecretinduminekey123"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # App Configuration
    PROJECT_NAME: str = "WEG Product API - MySQL"
    API_V1_PREFIX: str = "/api/v1"
    
    @computed_field
    @property
    def MYSQL_URL(self) -> str:
        """Synchronous MySQL URL (using pymysql)"""
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )
    
    class Config:
        env_file = ".env"
        # Allow extra environment variables without throwing errors
        extra = "ignore"

settings = Settings()


