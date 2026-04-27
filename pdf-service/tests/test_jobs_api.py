"""Tests for jobs API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
import fitz
import tempfile
import os

# Set temp db path before importing app
os.environ["DATABASE_PATH"] = tempfile.mktemp(suffix=".db")

from app.main import app


def create_text_pdf() -> bytes:
    """Create a simple text-based PDF."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "This is a test document. " * 50)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_empty_pdf() -> bytes:
    """Create an empty PDF (simulating scanned)."""
    doc = fitz.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_submit_job():
    """Should accept PDF and return job ID."""
    pdf_bytes = create_text_pdf()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/jobs",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )

    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_job_status():
    """Should return job status."""
    pdf_bytes = create_text_pdf()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create job
        create_response = await client.post(
            "/jobs",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        job_id = create_response.json()["job_id"]

        # Poll status
        status_response = await client.get(f"/jobs/{job_id}")

    assert status_response.status_code == 200
    data = status_response.json()
    assert data["job_id"] == job_id
    assert "status" in data


@pytest.mark.asyncio
async def test_job_not_found():
    """Should return 404 for unknown job."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/jobs/nonexistent123")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_job():
    """Should delete job."""
    pdf_bytes = create_text_pdf()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create job
        create_response = await client.post(
            "/jobs",
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        job_id = create_response.json()["job_id"]

        # Delete
        delete_response = await client.delete(f"/jobs/{job_id}")

    assert delete_response.status_code == 204
