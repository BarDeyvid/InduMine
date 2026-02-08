import secrets
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load environment variables from a .env file into os.environ
load_dotenv()

class Settings(BaseSettings):
    """
    Application settings and configuration management using Pydantic.

    This class handles environment variable parsing, default values, and 
    dynamic property generation for the application's infrastructure.

    Attributes:
        DB_HOST (str): Database server hostname.
        DB_PORT (int): Database server port (default: 3306).
        DB_USER (str): Database username.
        DB_PASSWORD (SecretStr): Database password, masked in logs/prints.
        DB_NAME (str): Name of the target database.
        SECRET_KEY (str): Secret key for signing Access JWTs.
        REFRESH_SECRET_KEY (str): Secret key for signing Refresh JWTs.
        ALGORITHM (str): Hashing algorithm for JWT (default: HS256).
        ACCESS_TOKEN_EXPIRE_MINUTES (int): Lifetime of an access token.
        REFRESH_TOKEN_EXPIRE_DAYS (int): Lifetime of a refresh token.
        BCRYPT_ROUNDS (int): Work factor for password hashing.
        ALLOWED_ORIGINS (list[str]): List of origins allowed for CORS.
        ENVIRONMENT (str): Current runtime environment (e.g., 'production').
        DEBUG (bool): Toggle for debug mode features.
    """

    # --- Database Configuration ---
    DB_HOST: str = Field(default="localhost")
    DB_PORT: int = Field(default=3306)
    DB_USER: str = Field(default="root")
    DB_PASSWORD: SecretStr = Field(...)
    DB_NAME: str = Field(default="indumine_db")
    
    # --- JWT Configuration ---
    # Generates a random secure key if one isn't provided in the environment
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32)
    )
    REFRESH_SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32)
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # --- Security & CORS ---
    BCRYPT_ROUNDS: int = 12
    ALLOWED_ORIGINS: list[str] = [
        "https://indumine.duckdns.org",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1"
    ]
    
    # --- App State ---
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    
    @property
    def DATABASE_URL(self) -> str:
        """
        Constructs the SQLAlchemy connection string from individual components.

        Returns:
            str: A fully formatted MySQL connection URI.
        """
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD.get_secret_value()}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

# Instantiate the settings object for use throughout the application.
# Type ignore handles the Pydantic/SecretStr validation complexity in static analysis.
settings = Settings()  # type: ignore