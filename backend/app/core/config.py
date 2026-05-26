from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://geomap:geomap@localhost:5433/geomap"
    SECRET_KEY: str = "troque-me-em-producao"

    model_config = {"env_file": ".env"}


settings = Settings()
