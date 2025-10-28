# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    # -------------------------------------------------------------------------
    # Server
    # -------------------------------------------------------------------------
    APP_ENV: str = "dev"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # -------------------------------------------------------------------------
    # Gemini Provider (default)
    # -------------------------------------------------------------------------
    SUMMARY_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # -------------------------------------------------------------------------
    # Limits
    # -------------------------------------------------------------------------
    MAX_INPUT_TOKENS: int = 120_000
    TARGET_SUMMARY_TOKENS: int = 800

    # -------------------------------------------------------------------------
    # Quiz Configuration
    # -------------------------------------------------------------------------
    QUIZ_NUM_QUESTIONS: int = 5
    QUIZ_STYLE: str = "mcq"

    # -------------------------------------------------------------------------
    # Config
    # -------------------------------------------------------------------------
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Split comma-separated CORS origins into list
    @field_validator("CORS_ORIGINS")
    @classmethod
    def split_origins(cls, v: str) -> List[str]:
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()