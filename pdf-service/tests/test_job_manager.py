"""Tests for job manager."""
import pytest
from app.services.job_manager import JobManager
from app.models import JobStatus


@pytest.mark.asyncio
async def test_create_job(temp_db_path):
    """Should create a new job and return job ID."""
    manager = JobManager(db_path=temp_db_path)
    await manager.initialize()

    job_id = await manager.create_job(filename="test.pdf", file_size=1024)

    assert job_id is not None
    assert len(job_id) == 12  # nanoid length

    await manager.close()


@pytest.mark.asyncio
async def test_get_job(temp_db_path):
    """Should retrieve job by ID."""
    manager = JobManager(db_path=temp_db_path)
    await manager.initialize()

    job_id = await manager.create_job(filename="test.pdf", file_size=1024)
    job = await manager.get_job(job_id)

    assert job is not None
    assert job["job_id"] == job_id
    assert job["status"] == JobStatus.PENDING.value
    assert job["filename"] == "test.pdf"

    await manager.close()


@pytest.mark.asyncio
async def test_update_job_status(temp_db_path):
    """Should update job status."""
    manager = JobManager(db_path=temp_db_path)
    await manager.initialize()

    job_id = await manager.create_job(filename="test.pdf", file_size=1024)
    await manager.update_job(job_id, status=JobStatus.PROCESSING, progress=50)

    job = await manager.get_job(job_id)
    assert job["status"] == JobStatus.PROCESSING.value
    assert job["progress"] == 50

    await manager.close()


@pytest.mark.asyncio
async def test_complete_job(temp_db_path):
    """Should complete job with result."""
    manager = JobManager(db_path=temp_db_path)
    await manager.initialize()

    job_id = await manager.create_job(filename="test.pdf", file_size=1024)
    await manager.complete_job(
        job_id,
        text="Extracted text",
        pages=3,
        method="tesseract",
        confidence=0.95,
        processing_time_ms=1500,
    )

    job = await manager.get_job(job_id)
    assert job["status"] == JobStatus.COMPLETED.value
    assert job["result_text"] == "Extracted text"
    assert job["result_pages"] == 3
    assert job["result_confidence"] == 0.95

    await manager.close()
