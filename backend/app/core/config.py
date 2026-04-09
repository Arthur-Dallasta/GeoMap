# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://geomap:geomap@localhost:5432/geomap"
    SECRET_KEY: str = "troque-me-em-producao"

    model_config = {"env_file": ".env"}


settings = Settings()
