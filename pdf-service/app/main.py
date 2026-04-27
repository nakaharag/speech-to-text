"""FastAPI application entry point."""
from fastapi import FastAPI
from app.routers import health, jobs

app = FastAPI(
    title="PDF OCR Service",
    description="OCR processing for scanned PDFs",
    version="1.0.0",
)

app.include_router(health.router)
app.include_router(jobs.router)
