from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    groq_api_key: str
    database_url: str = "postgresql://tokenledger:tokenledger@localhost:5432/tokenledger"
    fallback_to_sqlite: bool = False
    environment: str = "development"
    api_key: str = "dev-secret-key-123"

    # Model config
    small_model: str = "llama-3.1-8b-instant"
    large_model: str = "llama-3.3-70b-versatile"

    # Cost per 1k tokens in USD (Groq prices — fetched 2026-05-09)
    small_model_input_usd: float = 0.05
    small_model_output_usd: float = 0.08
    large_model_input_usd: float = 0.59
    large_model_output_usd: float = 0.79
    usd_to_myr: float = 4.7
    mcp_server_url: str = "http://127.0.0.1:8001"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
