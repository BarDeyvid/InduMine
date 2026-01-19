from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr
from dotenv import load_dotenv
import secrets

load_dotenv()

class Settings(BaseSettings):
    # Database
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=3306, env="DB_PORT")
    DB_USER: str = Field(default="root", env="DB_USER")
    DB_PASSWORD: SecretStr = Field(..., env="DB_PASSWORD")
    DB_NAME: str = Field(default="indumine_db", env="DB_NAME")
    
    # JWT - Generate secure keys automatically
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        env="SECRET_KEY"
    )
    REFRESH_SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        env="REFRESH_SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Security
    BCRYPT_ROUNDS: int = 12
    ALLOWED_ORIGINS: list[str] = [
        "https://indumine.duckdns.org",
        "https://api-indumine.duckdns.org",
        "http://localhost:8080",      # Added :8080
        "http://127.0.0.1:8080",    # Added :8080
        "http://localhost",
        "http://127.0.0.1"
    ]
    
    # Production/Development
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD.get_secret_value()}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }

settings = Settings()