# PDF OCR Microservice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python FastAPI microservice that performs OCR on scanned PDFs using Tesseract, with async job polling.

**Architecture:** Standalone Python service with SQLite for job state, Tesseract for OCR, PyMuPDF for PDF analysis. Communicates via HTTP with the Node.js backend. Cloud OCR providers are stub implementations for future use.

**Tech Stack:** Python 3.12, FastAPI, SQLite, PyMuPDF (fitz), pytesseract, pdf2image, Pydantic

---

## File Structure

```
pdf-service/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Environment config
│   ├── models.py            # Pydantic models
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── jobs.py          # Job endpoints
│   │   └── health.py        # Health endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── detector.py      # PDF type detection
│   │   ├── job_manager.py   # Job state management (SQLite)
│   │   └── ocr_pipeline.py  # OCR orchestration
│   └── providers/
│       ├── __init__.py
│       ├── base.py          # Abstract provider interface
│       └── tesseract.py     # Tesseract implementation
└── tests/
    ├── __init__.py
    ├── conftest.py          # Pytest fixtures
    ├── test_health.py
    ├── test_detector.py
    ├── test_job_manager.py
    ├── test_tesseract.py
    └── test_jobs_api.py
```

---

## Task 1: Project Setup

**Files:**
- Create: `pdf-service/requirements.txt`
- Create: `pdf-service/app/__init__.py`
- Create: `pdf-service/app/config.py`

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p pdf-service/app/routers pdf-service/app/services pdf-service/app/providers pdf-service/tests
```

- [ ] **Step 2: Create requirements.txt**

```txt
fastapi==0.109.2
uvicorn[standard]==0.27.1
python-multipart==0.0.9
pydantic==2.6.1
pydantic-settings==2.1.0
pymupdf==1.23.22
pytesseract==0.3.10
pdf2image==1.16.3
pillow==10.2.0
aiosqlite==0.19.0
pytest==8.0.0
pytest-asyncio==0.23.4
httpx==0.26.0
```

- [ ] **Step 3: Create app/__init__.py**

```python
"""PDF OCR Microservice."""
```

- [ ] **Step 4: Create app/config.py**

```python
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
```

- [ ] **Step 5: Verify Python environment**

```bash
cd pdf-service && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
```

Expected: All packages install successfully

---

## Task 2: Pydantic Models

**Files:**
- Create: `pdf-service/app/models.py`
- Create: `pdf-service/tests/__init__.py`
- Create: `pdf-service/tests/conftest.py`

- [ ] **Step 1: Create tests/__init__.py**

```python
"""Test package."""
```

- [ ] **Step 2: Create tests/conftest.py**

```python
"""Pytest fixtures."""
import pytest
import tempfile
import os


@pytest.fixture
def temp_db_path():
    """Create a temporary database path for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield os.path.join(tmpdir, "test_jobs.db")
```

- [ ] **Step 3: Create app/models.py**

```python
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
```

- [ ] **Step 4: Run Python to verify models compile**

```bash
cd pdf-service && source venv/bin/activate && python -c "from app.models import JobStatus, JobCreateResponse; print('Models OK')"
```

Expected: `Models OK`

---

## Task 3: Health Router

**Files:**
- Create: `pdf-service/app/routers/__init__.py`
- Create: `pdf-service/app/routers/health.py`
- Create: `pdf-service/tests/test_health.py`

- [ ] **Step 1: Write the failing test for health endpoint**

Create `pdf-service/tests/test_health.py`:

```python
"""Tests for health endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_returns_ok():
    """Health endpoint should return status ok."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_health.py -v
```

Expected: FAIL (app.main does not exist)

- [ ] **Step 3: Create routers/__init__.py**

```python
"""Router package."""
```

- [ ] **Step 4: Create routers/health.py**

```python
"""Health check endpoint."""
from fastapi import APIRouter
from app.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(status="ok", version="1.0.0")
```

- [ ] **Step 5: Create app/main.py**

```python
"""FastAPI application entry point."""
from fastapi import FastAPI
from app.routers import health

app = FastAPI(
    title="PDF OCR Service",
    description="OCR processing for scanned PDFs",
    version="1.0.0",
)

app.include_router(health.router)
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_health.py -v
```

Expected: PASS

---

## Task 4: Job Manager (SQLite)

**Files:**
- Create: `pdf-service/app/services/__init__.py`
- Create: `pdf-service/app/services/job_manager.py`
- Create: `pdf-service/tests/test_job_manager.py`

- [ ] **Step 1: Create services/__init__.py**

```python
"""Services package."""
```

- [ ] **Step 2: Write failing test for job creation**

Create `pdf-service/tests/test_job_manager.py`:

```python
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_job_manager.py -v
```

Expected: FAIL (job_manager module does not exist)

- [ ] **Step 4: Implement job_manager.py**

Create `pdf-service/app/services/job_manager.py`:

```python
"""Job state management with SQLite."""
import secrets
import string
from datetime import datetime
from typing import Optional
import aiosqlite
from app.models import JobStatus


def generate_job_id(length: int = 12) -> str:
    """Generate a random job ID."""
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class JobManager:
    """Manages OCR job state in SQLite."""

    def __init__(self, db_path: str = "/app/data/jobs.db"):
        self.db_path = db_path
        self._db: Optional[aiosqlite.Connection] = None

    async def initialize(self) -> None:
        """Initialize database connection and create tables."""
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row

        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                filename TEXT,
                file_size INTEGER,
                progress INTEGER DEFAULT 0,
                method TEXT,
                result_text TEXT,
                result_pages INTEGER,
                result_confidence REAL,
                result_processing_time_ms INTEGER,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await self._db.commit()

    async def close(self) -> None:
        """Close database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    async def create_job(self, filename: str, file_size: int) -> str:
        """Create a new job and return its ID."""
        job_id = generate_job_id()
        now = datetime.utcnow().isoformat()

        await self._db.execute(
            """
            INSERT INTO jobs (job_id, filename, file_size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, filename, file_size, now, now),
        )
        await self._db.commit()
        return job_id

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Get job by ID."""
        async with self._db.execute(
            "SELECT * FROM jobs WHERE job_id = ?", (job_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None

    async def update_job(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        progress: Optional[int] = None,
        method: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update job fields."""
        updates = []
        params = []

        if status is not None:
            updates.append("status = ?")
            params.append(status.value)
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        if method is not None:
            updates.append("method = ?")
            params.append(method)
        if error is not None:
            updates.append("error = ?")
            params.append(error)

        updates.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(job_id)

        await self._db.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?",
            params,
        )
        await self._db.commit()

    async def complete_job(
        self,
        job_id: str,
        text: str,
        pages: int,
        method: str,
        confidence: float,
        processing_time_ms: int,
    ) -> None:
        """Mark job as completed with results."""
        now = datetime.utcnow().isoformat()
        await self._db.execute(
            """
            UPDATE jobs SET
                status = ?,
                progress = 100,
                method = ?,
                result_text = ?,
                result_pages = ?,
                result_confidence = ?,
                result_processing_time_ms = ?,
                updated_at = ?
            WHERE job_id = ?
            """,
            (
                JobStatus.COMPLETED.value,
                method,
                text,
                pages,
                confidence,
                processing_time_ms,
                now,
                job_id,
            ),
        )
        await self._db.commit()

    async def fail_job(self, job_id: str, error: str) -> None:
        """Mark job as failed."""
        await self.update_job(job_id, status=JobStatus.FAILED, error=error)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_job_manager.py -v
```

Expected: PASS (4 tests)

---

## Task 5: PDF Detector

**Files:**
- Create: `pdf-service/app/services/detector.py`
- Create: `pdf-service/tests/test_detector.py`

- [ ] **Step 1: Write failing test for detector**

Create `pdf-service/tests/test_detector.py`:

```python
"""Tests for PDF detector."""
import pytest
from app.services.detector import PDFDetector, PDFType


def test_detect_text_based_pdf():
    """Should detect text-based PDF."""
    # Create a simple PDF with text in memory
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "This is a test document with plenty of text content. " * 20)
    pdf_bytes = doc.tobytes()
    doc.close()

    detector = PDFDetector()
    result = detector.analyze(pdf_bytes)

    assert result.pdf_type == PDFType.TEXT_BASED
    assert result.page_count == 1
    assert result.has_text is True
    assert result.needs_ocr is False


def test_detect_empty_pdf_needs_ocr():
    """Should detect that empty PDF needs OCR."""
    import fitz

    doc = fitz.open()
    doc.new_page()  # Empty page
    pdf_bytes = doc.tobytes()
    doc.close()

    detector = PDFDetector()
    result = detector.analyze(pdf_bytes)

    assert result.pdf_type == PDFType.SCANNED
    assert result.needs_ocr is True


def test_detect_mixed_content():
    """Should detect mixed content PDF."""
    import fitz

    doc = fitz.open()
    # Page 1: text
    page1 = doc.new_page()
    page1.insert_text((50, 50), "Text content here. " * 50)
    # Page 2: empty (simulating scanned)
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()

    detector = PDFDetector()
    result = detector.analyze(pdf_bytes)

    assert result.page_count == 2
    # Mixed content should still suggest OCR for some pages
    assert result.pages_needing_ocr >= 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_detector.py -v
```

Expected: FAIL (detector module does not exist)

- [ ] **Step 3: Implement detector.py**

Create `pdf-service/app/services/detector.py`:

```python
"""PDF type detection using PyMuPDF."""
from dataclasses import dataclass
from enum import Enum
from typing import List
import fitz  # PyMuPDF


class PDFType(str, Enum):
    """Type of PDF content."""

    TEXT_BASED = "text_based"
    SCANNED = "scanned"
    MIXED = "mixed"


@dataclass
class PageAnalysis:
    """Analysis result for a single page."""

    page_num: int
    char_count: int
    has_images: bool
    needs_ocr: bool


@dataclass
class PDFAnalysisResult:
    """Result of PDF analysis."""

    pdf_type: PDFType
    page_count: int
    total_chars: int
    has_text: bool
    has_images: bool
    needs_ocr: bool
    pages_needing_ocr: int
    page_details: List[PageAnalysis]


class PDFDetector:
    """Detects whether a PDF needs OCR processing."""

    MIN_CHARS_PER_PAGE = 100  # Threshold for "has meaningful text"

    def analyze(self, pdf_bytes: bytes) -> PDFAnalysisResult:
        """Analyze PDF to determine if OCR is needed."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        page_details = []
        total_chars = 0
        pages_with_text = 0
        pages_with_images = 0
        pages_needing_ocr = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            char_count = len(text.strip())
            total_chars += char_count

            # Check for images
            image_list = page.get_images()
            has_images = len(image_list) > 0

            # Determine if this page needs OCR
            needs_ocr = char_count < self.MIN_CHARS_PER_PAGE
            if needs_ocr:
                pages_needing_ocr += 1
            else:
                pages_with_text += 1

            if has_images:
                pages_with_images += 1

            page_details.append(
                PageAnalysis(
                    page_num=page_num,
                    char_count=char_count,
                    has_images=has_images,
                    needs_ocr=needs_ocr,
                )
            )

        doc.close()

        # Determine overall PDF type
        page_count = len(page_details)
        has_text = pages_with_text > 0
        has_images = pages_with_images > 0

        if pages_needing_ocr == 0:
            pdf_type = PDFType.TEXT_BASED
            needs_ocr = False
        elif pages_needing_ocr == page_count:
            pdf_type = PDFType.SCANNED
            needs_ocr = True
        else:
            pdf_type = PDFType.MIXED
            needs_ocr = True

        return PDFAnalysisResult(
            pdf_type=pdf_type,
            page_count=page_count,
            total_chars=total_chars,
            has_text=has_text,
            has_images=has_images,
            needs_ocr=needs_ocr,
            pages_needing_ocr=pages_needing_ocr,
            page_details=page_details,
        )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_detector.py -v
```

Expected: PASS (3 tests)

---

## Task 6: Tesseract Provider

**Files:**
- Create: `pdf-service/app/providers/__init__.py`
- Create: `pdf-service/app/providers/base.py`
- Create: `pdf-service/app/providers/tesseract.py`
- Create: `pdf-service/tests/test_tesseract.py`

- [ ] **Step 1: Create providers/__init__.py**

```python
"""OCR providers package."""
from app.providers.base import OCRProvider, OCRResult
from app.providers.tesseract import TesseractProvider

__all__ = ["OCRProvider", "OCRResult", "TesseractProvider"]
```

- [ ] **Step 2: Create providers/base.py**

```python
"""Abstract base class for OCR providers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List


@dataclass
class WordConfidence:
    """Confidence score for a single word."""

    word: str
    confidence: float


@dataclass
class OCRResult:
    """Result from OCR processing."""

    text: str
    confidence: float
    word_confidences: List[WordConfidence]
    provider: str


class OCRProvider(ABC):
    """Abstract base class for OCR providers."""

    @abstractmethod
    async def extract_text(self, image_bytes: bytes, language: str = "eng") -> OCRResult:
        """Extract text from an image."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Return provider name."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available."""
        pass
```

- [ ] **Step 3: Write failing test for Tesseract provider**

Create `pdf-service/tests/test_tesseract.py`:

```python
"""Tests for Tesseract provider."""
import pytest
from PIL import Image, ImageDraw, ImageFont
import io
from app.providers.tesseract import TesseractProvider


def create_test_image_with_text(text: str) -> bytes:
    """Create a test image with text."""
    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)
    # Use default font
    draw.text((10, 30), text, fill="black")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_tesseract_is_available():
    """Tesseract provider should be available."""
    provider = TesseractProvider()
    assert provider.is_available() is True
    assert provider.get_name() == "tesseract"


@pytest.mark.asyncio
async def test_tesseract_extracts_text():
    """Tesseract should extract text from image."""
    provider = TesseractProvider()
    image_bytes = create_test_image_with_text("Hello World")

    result = await provider.extract_text(image_bytes, language="eng")

    assert "Hello" in result.text or "hello" in result.text.lower()
    assert result.provider == "tesseract"
    assert 0 <= result.confidence <= 1


@pytest.mark.asyncio
async def test_tesseract_returns_confidence():
    """Tesseract should return confidence scores."""
    provider = TesseractProvider()
    image_bytes = create_test_image_with_text("Test Document")

    result = await provider.extract_text(image_bytes)

    assert result.confidence >= 0
    # Word confidences may be empty for simple images, that's OK
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_tesseract.py -v
```

Expected: FAIL (tesseract module does not exist)

- [ ] **Step 5: Implement tesseract.py**

Create `pdf-service/app/providers/tesseract.py`:

```python
"""Tesseract OCR provider."""
import asyncio
from io import BytesIO
from typing import List
import pytesseract
from PIL import Image
from app.providers.base import OCRProvider, OCRResult, WordConfidence


class TesseractProvider(OCRProvider):
    """OCR provider using Tesseract."""

    def get_name(self) -> str:
        """Return provider name."""
        return "tesseract"

    def is_available(self) -> bool:
        """Check if Tesseract is available."""
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    async def extract_text(self, image_bytes: bytes, language: str = "eng") -> OCRResult:
        """Extract text from image using Tesseract."""
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._extract_sync, image_bytes, language
        )

    def _extract_sync(self, image_bytes: bytes, language: str) -> OCRResult:
        """Synchronous text extraction."""
        image = Image.open(BytesIO(image_bytes))

        # Get detailed data with confidence scores
        data = pytesseract.image_to_data(
            image, lang=language, output_type=pytesseract.Output.DICT
        )

        # Extract text and confidence
        words = []
        confidences = []
        word_confidences: List[WordConfidence] = []

        for i, text in enumerate(data["text"]):
            text = text.strip()
            if text:
                conf = data["conf"][i]
                # Tesseract returns -1 for low confidence, normalize to 0-1
                if conf >= 0:
                    normalized_conf = conf / 100.0
                    words.append(text)
                    confidences.append(normalized_conf)
                    word_confidences.append(WordConfidence(word=text, confidence=normalized_conf))

        full_text = " ".join(words)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return OCRResult(
            text=full_text,
            confidence=avg_confidence,
            word_confidences=word_confidences,
            provider="tesseract",
        )
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_tesseract.py -v
```

Expected: PASS (3 tests) - Note: requires tesseract-ocr installed on system

---

## Task 7: OCR Pipeline

**Files:**
- Create: `pdf-service/app/services/ocr_pipeline.py`

- [ ] **Step 1: Create ocr_pipeline.py**

```python
"""OCR pipeline orchestration."""
import time
from dataclasses import dataclass
from typing import List, Optional, Callable
import fitz
from pdf2image import convert_from_bytes
from app.providers.base import OCRProvider, OCRResult
from app.providers.tesseract import TesseractProvider
from app.services.detector import PDFDetector, PDFAnalysisResult
from app.config import settings


@dataclass
class PipelineResult:
    """Result from OCR pipeline."""

    text: str
    pages: int
    method: str
    confidence: float
    processing_time_ms: int


class OCRPipeline:
    """Orchestrates PDF analysis and OCR processing."""

    def __init__(self):
        self.detector = PDFDetector()
        self.tesseract = TesseractProvider()

    async def process(
        self,
        pdf_bytes: bytes,
        language: str = "eng",
        progress_callback: Optional[Callable[[int], None]] = None,
    ) -> PipelineResult:
        """Process PDF and extract text using OCR if needed."""
        start_time = time.time()

        # Analyze PDF
        analysis = self.detector.analyze(pdf_bytes)

        if not analysis.needs_ocr:
            # Text-based PDF - extract directly
            text = self._extract_text_directly(pdf_bytes)
            return PipelineResult(
                text=text,
                pages=analysis.page_count,
                method="text_extraction",
                confidence=1.0,
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

        # Need OCR - convert PDF pages to images and OCR
        texts = []
        confidences = []

        # Convert PDF to images
        images = convert_from_bytes(pdf_bytes, dpi=300)

        for i, image in enumerate(images):
            if progress_callback:
                progress = int((i / len(images)) * 100)
                progress_callback(progress)

            # Convert PIL Image to bytes
            from io import BytesIO

            buffer = BytesIO()
            image.save(buffer, format="PNG")
            image_bytes = buffer.getvalue()

            # Run OCR
            result = await self.tesseract.extract_text(image_bytes, language)
            texts.append(result.text)
            confidences.append(result.confidence)

        full_text = "\n\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return PipelineResult(
            text=full_text,
            pages=len(images),
            method="tesseract",
            confidence=avg_confidence,
            processing_time_ms=int((time.time() - start_time) * 1000),
        )

    def _extract_text_directly(self, pdf_bytes: bytes) -> str:
        """Extract text directly from PDF without OCR."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        texts = []
        for page in doc:
            texts.append(page.get_text())
        doc.close()
        return "\n\n".join(texts)
```

- [ ] **Step 2: Verify pipeline compiles**

```bash
cd pdf-service && source venv/bin/activate && python -c "from app.services.ocr_pipeline import OCRPipeline; print('Pipeline OK')"
```

Expected: `Pipeline OK`

---

## Task 8: Jobs Router

**Files:**
- Create: `pdf-service/app/routers/jobs.py`
- Create: `pdf-service/tests/test_jobs_api.py`

- [ ] **Step 1: Write failing test for jobs API**

Create `pdf-service/tests/test_jobs_api.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_jobs_api.py -v
```

Expected: FAIL (jobs router not registered)

- [ ] **Step 3: Implement jobs.py router**

Create `pdf-service/app/routers/jobs.py`:

```python
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
```

- [ ] **Step 4: Update main.py to include jobs router**

Update `pdf-service/app/main.py`:

```python
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd pdf-service && source venv/bin/activate && pytest tests/test_jobs_api.py -v
```

Expected: PASS (4 tests)

---

## Task 9: Dockerfile

**Files:**
- Create: `pdf-service/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-por \
    tesseract-ocr-spa \
    poppler-utils \
    libgl1-mesa-glx \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Build Docker image to verify**

```bash
cd pdf-service && docker build -t pdf-service:test .
```

Expected: Build completes successfully

- [ ] **Step 3: Test Docker image**

```bash
docker run -d --name pdf-service-test -p 8000:8000 pdf-service:test && sleep 5 && curl http://localhost:8000/health && docker stop pdf-service-test && docker rm pdf-service-test
```

Expected: `{"status":"ok","version":"1.0.0"}`

---

## Task 10: Docker Compose Integration

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add pdf-service to docker-compose.yml**

Add after the `backend` service:

```yaml
  pdf-service:
    build:
      context: ./pdf-service
      dockerfile: Dockerfile
    networks:
      - internal
    expose:
      - "8000"
    environment:
      - OCR_CLOUD_PROVIDER=${OCR_CLOUD_PROVIDER:-none}
      - OCR_CONFIDENCE_THRESHOLD=${OCR_CONFIDENCE_THRESHOLD:-0.85}
      - OCR_MAX_FILE_SIZE=${OCR_MAX_FILE_SIZE:-52428800}
      - OCR_MAX_PAGES=${OCR_MAX_PAGES:-50}
      - DATABASE_PATH=/app/data/jobs.db
    volumes:
      - pdf-service-data:/app/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8000/health || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 30s
```

- [ ] **Step 2: Add volume to volumes section**

```yaml
volumes:
  postgres-data:
  backend-data:
  pdf-service-data:
```

- [ ] **Step 3: Update backend to depend on pdf-service**

Update backend service `depends_on`:

```yaml
  backend:
    # ... existing config ...
    depends_on:
      postgres:
        condition: service_healthy
      pdf-service:
        condition: service_healthy
```

- [ ] **Step 4: Test docker-compose builds**

```bash
docker compose build pdf-service
```

Expected: Build completes successfully

---

## Task 11: Node.js Backend Integration

**Files:**
- Modify: `backend/src/controllers/pdf.controller.ts`
- Modify: `backend/src/services/pdf.service.ts`

- [ ] **Step 1: Add OCR endpoints to pdf.controller.ts**

Add these new endpoints to `backend/src/controllers/pdf.controller.ts`:

```typescript
  @Post('ocr')
  @UseInterceptors(FileInterceptor('file'))
  async submitOcrJob(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    // Forward to Python PDF service
    const formData = new FormData();
    formData.append('file', new Blob([file.buffer]), file.originalname);

    try {
      const response = await fetch('http://pdf-service:8000/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'OCR service error',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('ocr/:jobId')
  async getOcrJobStatus(@Param('jobId') jobId: string) {
    try {
      const response = await fetch(`http://pdf-service:8000/jobs/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('OCR service error', response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Delete('ocr/:jobId')
  async deleteOcrJob(@Param('jobId') jobId: string) {
    try {
      const response = await fetch(`http://pdf-service:8000/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        throw new HttpException('Failed to delete job', response.status);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
```

- [ ] **Step 2: Update convert endpoint to use OCR for scanned PDFs**

Modify the `convert` method in `pdf.controller.ts` to check `needsOcr` and redirect:

```typescript
  // In the convert method, after extractResult check:
  if (extractResult.needsOcr) {
    // Return flag to frontend to use OCR endpoint
    return {
      needsOcr: true,
      message: 'This PDF requires OCR processing. Please use the /pdf/ocr endpoint.',
      pageCount: extractResult.pageCount,
    };
  }
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd backend && npm run build
```

Expected: Build succeeds

---

## Task 12: Final Integration Test

- [ ] **Step 1: Start all services**

```bash
docker compose up -d --build
```

- [ ] **Step 2: Wait for services to be healthy**

```bash
docker compose ps
```

Expected: All services show "healthy"

- [ ] **Step 3: Test PDF OCR endpoint**

```bash
# Create a test PDF
python3 -c "
import fitz
doc = fitz.open()
page = doc.new_page()
page.insert_text((50,50), 'Test document')
doc.save('/tmp/test.pdf')
doc.close()
"

# Submit for OCR
curl -X POST http://localhost:3002/pdf/ocr \
  -F "file=@/tmp/test.pdf" \
  | jq .
```

Expected: Returns `{"job_id": "...", "status": "pending", ...}`

- [ ] **Step 4: Poll for completion**

```bash
# Replace JOB_ID with actual job ID from previous step
curl http://localhost:3002/pdf/ocr/JOB_ID | jq .
```

Expected: Returns completed status with extracted text

---

## Summary

This plan implements Phase 1 of the PDF OCR microservice:

1. **Tasks 1-3:** Project setup, models, health endpoint
2. **Tasks 4-6:** Job manager (SQLite), PDF detector, Tesseract provider
3. **Task 7:** OCR pipeline orchestration
4. **Tasks 8-9:** Jobs API, Dockerfile
5. **Tasks 10-11:** Docker Compose integration, Node.js backend integration
6. **Task 12:** End-to-end testing

**Cloud providers are NOT implemented** - they remain as future work when API keys are available.
