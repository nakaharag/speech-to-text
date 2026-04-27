"""Application configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    ocr_cloud_provider: str = "none"
    ocr_confidence_threshold: float = 0.85
    ocr_max_file_size: int = 52428800  # 50MB
    ocr_max_pages: int = 50
    ocr_job_ttl: int = 3600  # 1 hour
    database_path: str = "/app/data/jobs.db"

    class Config:
        env_prefix = ""


settings = Settings()
