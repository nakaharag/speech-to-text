"""Pydantic models for request/response schemas."""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Job processing status."""

    PENDING = "pending"
    DETECTING = "detecting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobOptions(BaseModel):
    """Options for OCR job."""

    language: str = Field(default="eng", description="Tesseract language code")
    preferred_provider: str = Field(default="auto", description="OCR provider preference")


class JobCreateResponse(BaseModel):
    """Response when creating a new job."""

    job_id: str
    status: JobStatus
    created_at: datetime


class OCRResult(BaseModel):
    """Result of OCR processing."""

    text: str
    pages: int
    method: str
    confidence: float
    processing_time_ms: int


class JobStatusResponse(BaseModel):
    """Response when polling job status."""

    job_id: str
    status: JobStatus
    progress: Optional[int] = None
    method: Optional[str] = None
    created_at: datetime
    result: Optional[OCRResult] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str = "1.0.0"
