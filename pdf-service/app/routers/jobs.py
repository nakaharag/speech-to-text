"""Job management endpoints."""
import asyncio
from datetime import datetime
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, BackgroundTasks
from app.models import JobStatus, JobCreateResponse, JobStatusResponse, JobOptions, OCRResult
from app.services.job_manager import JobManager
from app.services.ocr_pipeline import OCRPipeline
from app.config import settings

router = APIRouter()

# Global job manager instance
_job_manager: JobManager = None
_pipeline: OCRPipeline = None


async def get_job_manager() -> JobManager:
    """Get or create job manager instance."""
    global _job_manager
    if _job_manager is None:
        _job_manager = JobManager(db_path=settings.database_path)
        await _job_manager.initialize()
    return _job_manager


async def get_pipeline() -> OCRPipeline:
    """Get or create pipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = OCRPipeline()
    return _pipeline


async def process_job(job_id: str, pdf_bytes: bytes, language: str):
    """Background task to process OCR job."""
    manager = await get_job_manager()
    pipeline = await get_pipeline()

    try:
        await manager.update_job(job_id, status=JobStatus.DETECTING)

        async def progress_callback(progress: int):
            await manager.update_job(job_id, progress=progress)

        await manager.update_job(job_id, status=JobStatus.PROCESSING)

        result = await pipeline.process(
            pdf_bytes,
            language=language,
            progress_callback=lambda p: asyncio.create_task(
                manager.update_job(job_id, progress=p)
            ),
        )

        await manager.complete_job(
            job_id,
            text=result.text,
            pages=result.pages,
            method=result.method,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms,
        )

    except Exception as e:
        await manager.fail_job(job_id, str(e))


@router.post("/jobs", response_model=JobCreateResponse, status_code=202)
async def create_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    options: str = Form(default="{}"),
):
    """Submit a PDF for OCR processing."""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Read file
    pdf_bytes = await file.read()

    # Validate file size
    if len(pdf_bytes) > settings.ocr_max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"PDF exceeds {settings.ocr_max_file_size // (1024*1024)}MB limit",
        )

    # Parse options
    import json

    try:
        opts = JobOptions(**json.loads(options))
    except Exception:
        opts = JobOptions()

    # Create job
    manager = await get_job_manager()
    job_id = await manager.create_job(filename=file.filename, file_size=len(pdf_bytes))

    # Start background processing
    background_tasks.add_task(process_job, job_id, pdf_bytes, opts.language)

    return JobCreateResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        created_at=datetime.utcnow(),
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get job status and result."""
    manager = await get_job_manager()
    job = await manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = None
    if job["status"] == JobStatus.COMPLETED.value and job["result_text"]:
        result = OCRResult(
            text=job["result_text"],
            pages=job["result_pages"],
            method=job["method"],
            confidence=job["result_confidence"],
            processing_time_ms=job["result_processing_time_ms"],
        )

    return JobStatusResponse(
        job_id=job["job_id"],
        status=JobStatus(job["status"]),
        progress=job["progress"],
        method=job["method"],
        created_at=datetime.fromisoformat(job["created_at"]),
        result=result,
        error=job["error"],
    )


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str):
    """Delete a job."""
    manager = await get_job_manager()
    job = await manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # For now, just mark as failed/deleted
    await manager.fail_job(job_id, "Deleted by user")
    return None
