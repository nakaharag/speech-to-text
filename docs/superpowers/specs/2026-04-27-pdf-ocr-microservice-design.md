# PDF OCR Microservice Design

## Overview

A standalone Python microservice to handle PDF text extraction with OCR capabilities, supporting both text-based PDFs (fast extraction) and scanned PDFs (tiered OCR approach).

## Requirements

| Requirement | Decision |
|-------------|----------|
| Detection | Real-time: text-based vs scanned |
| Text PDFs | Keep current pdf-parse in Node.js (fast, free) |
| OCR Tier 1 | Tesseract (free, local) |
| OCR Tier 2 | Cloud fallback (AWS Textract/Google Vision/Azure) |
| Providers | Adapter pattern, configurable via env |
| Communication | Async polling (job ID → poll status) |
| Language | Python with FastAPI |
| Job Storage | SQLite (lightweight, no extra DB) |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                          │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Node.js Backend (NestJS)                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  PDF Controller │───▶│  PDF Service    │───▶│ Text-based?  │  │
│  └─────────────────┘    └─────────────────┘    └──────┬───────┘  │
│                                                   YES │ NO       │
│                                          ┌────────────┴───────┐  │
│                                          ▼                    ▼  │
│                                   pdf-parse            HTTP call │
│                                   (fast, local)        to Python │
└──────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Python PDF Microservice (FastAPI)               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐ │
│  │ Job Manager │──▶│  Detector   │──▶│     OCR Pipeline        │ │
│  │  (SQLite)   │   │ (PyMuPDF)   │   │  Tesseract → Cloud      │ │
│  └─────────────┘   └─────────────┘   └─────────────────────────┘ │
│                                              │                    │
│                           ┌──────────────────┼──────────────────┐│
│                           ▼                  ▼                  ▼││
│                      AWS Textract    Google Vision    Azure CV   ││
│                       (adapter)        (adapter)      (adapter)  ││
└──────────────────────────────────────────────────────────────────┘
```

## Detection Strategy

The microservice uses a multi-signal approach to detect if a PDF needs OCR:

1. **Text layer check** (PyMuPDF): Extract text, check if meaningful content exists
2. **Image analysis**: Count embedded images vs text blocks per page
3. **Character density**: If `chars_per_page < 100`, likely scanned
4. **Font detection**: Scanned PDFs often lack embedded fonts

Decision matrix:
- Has text layer with good density → **Text extraction** (no OCR)
- Has images but no/minimal text → **OCR required**
- Mixed content → **Hybrid** (extract text + OCR images)

## OCR Pipeline (Tiered Approach)

### Phase 1: Tesseract Only (Initial Implementation)

```
PDF Input
    │
    ▼
┌─────────────────┐
│  Tesseract OCR  │ ◀── Free, local, good for most cases
│  (pytesseract)  │
└────────┬────────┘
         │
         ▼
    Return Result
    (with confidence score)
```

### Phase 2: Cloud Fallback (Future - When Keys Available)

```
PDF Input
    │
    ▼
┌─────────────────┐
│  Tesseract OCR  │ ◀── Tier 1 (free, local)
│  (pytesseract)  │
└────────┬────────┘
         │
    confidence < 0.85?
         │
         ▼ YES
┌─────────────────┐
│   Cloud OCR     │ ◀── Tier 2 (paid, high quality)
│ (configurable)  │
└────────┬────────┘
         │
         ▼
    Return Result
```

### Confidence Scoring

Tesseract provides per-word confidence. Aggregate scoring:
- `avg_confidence >= 0.85` → Accept Tesseract result
- `avg_confidence < 0.85` → Escalate to cloud OCR
- Cloud OCR failure → Return Tesseract result with warning

## API Design

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/jobs` | POST | Submit PDF for OCR processing |
| `/jobs/{job_id}` | GET | Poll job status and get result |
| `/jobs/{job_id}` | DELETE | Cancel/cleanup job |

### Job States

```
PENDING → DETECTING → PROCESSING → COMPLETED
                  ↘               ↗
                    → FAILED ←────
```

### Submit Job

```http
POST /jobs
Content-Type: multipart/form-data

file: <pdf_binary>
options: {"preferred_provider": "auto", "language": "eng"}
```

Response `202 Accepted`:
```json
{
  "job_id": "abc123",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Poll Status

```http
GET /jobs/{job_id}
```

Response `200 OK` (processing):
```json
{
  "job_id": "abc123",
  "status": "processing",
  "progress": 45,
  "method": "tesseract",
  "created_at": "2024-01-15T10:30:00Z"
}
```

Response `200 OK` (completed):
```json
{
  "job_id": "abc123",
  "status": "completed",
  "result": {
    "text": "Extracted text content...",
    "pages": 5,
    "method": "tesseract",
    "confidence": 0.92,
    "processing_time_ms": 3500
  }
}
```

Response `200 OK` (failed):
```json
{
  "job_id": "abc123",
  "status": "failed",
  "error": "Cloud OCR quota exceeded",
  "fallback_result": {
    "text": "Partial extraction...",
    "method": "tesseract",
    "confidence": 0.72
  }
}
```

## Cloud OCR Adapters

### Interface

```python
class OCRProvider(ABC):
    @abstractmethod
    async def extract_text(self, image: bytes, language: str) -> OCRResult:
        pass

    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass
```

### Implementations

1. **TesseractProvider** (default, always available)
   - Uses `pytesseract` with `pdf2image`
   - Supports 100+ languages
   - Returns word-level confidence scores

2. **AWSTextractProvider**
   - Uses `boto3` with Textract API
   - Best for tables, forms, structured documents
   - Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

3. **GoogleVisionProvider**
   - Uses `google-cloud-vision` SDK
   - Fast, good general accuracy
   - Requires `GOOGLE_APPLICATION_CREDENTIALS`

4. **AzureComputerVisionProvider**
   - Uses `azure-ai-vision` SDK
   - Good accuracy, competitive pricing
   - Requires `AZURE_CV_ENDPOINT`, `AZURE_CV_KEY`

### Provider Selection

Environment variable `OCR_CLOUD_PROVIDER`:
- `none` (default): Tesseract only, no cloud fallback - **initial implementation**
- `auto`: Try providers in order of availability (when keys configured)
- `aws`: Force AWS Textract
- `google`: Force Google Vision
- `azure`: Force Azure Computer Vision

**Note:** Cloud providers are optional. The system works fully with Tesseract alone. Add cloud keys later for improved accuracy on complex documents.

## Project Structure

```
pdf-service/
├── Dockerfile
├── requirements.txt
├── pyproject.toml
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
│   │   ├── job_manager.py   # Job state management
│   │   ├── ocr_pipeline.py  # Tiered OCR orchestration
│   │   └── text_extractor.py # Text-based PDF extraction
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py          # Abstract provider
│   │   ├── tesseract.py     # Tesseract implementation
│   │   ├── aws_textract.py  # AWS implementation
│   │   ├── google_vision.py # Google implementation
│   │   └── azure_cv.py      # Azure implementation
│   └── db/
│       ├── __init__.py
│       └── sqlite.py        # SQLite job storage
└── tests/
    ├── __init__.py
    ├── test_detector.py
    ├── test_ocr_pipeline.py
    └── test_providers.py
```

## Docker Integration

### New Service in docker-compose.yml

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
    - OCR_CLOUD_PROVIDER=${OCR_CLOUD_PROVIDER:-auto}
    - OCR_CONFIDENCE_THRESHOLD=${OCR_CONFIDENCE_THRESHOLD:-0.85}
    - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
    - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
    - AWS_REGION=${AWS_REGION:-us-east-1}
    - GOOGLE_APPLICATION_CREDENTIALS=${GOOGLE_APPLICATION_CREDENTIALS:-}
    - AZURE_CV_ENDPOINT=${AZURE_CV_ENDPOINT:-}
    - AZURE_CV_KEY=${AZURE_CV_KEY:-}
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

### Dockerfile

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

# Create data directory
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Node.js Backend Integration

### Changes to pdf.controller.ts

```typescript
// New endpoint for OCR jobs
@Post('ocr')
async submitOcrJob(@UploadedFile() file: Express.Multer.File) {
  // Forward to Python service
  const response = await fetch('http://pdf-service:8000/jobs', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

@Get('ocr/:jobId')
async getOcrJobStatus(@Param('jobId') jobId: string) {
  const response = await fetch(`http://pdf-service:8000/jobs/${jobId}`);
  return response.json();
}
```

### Changes to pdf.service.ts

```typescript
async extractText(buffer: Buffer): Promise<PdfExtractResult> {
  // Try text extraction first
  const data = await pdfParse(buffer);
  const avgCharsPerPage = data.text.length / data.numpages;

  if (avgCharsPerPage >= 100) {
    // Text-based PDF - use existing fast path
    return { text: data.text, pageCount: data.numpages, needsOcr: false };
  }

  // Needs OCR - return flag for controller to handle
  return { text: '', pageCount: data.numpages, needsOcr: true };
}
```

## Error Handling

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Invalid PDF | 400 | `{"error": "Invalid PDF format"}` |
| PDF too large | 413 | `{"error": "PDF exceeds 50MB limit"}` |
| Job not found | 404 | `{"error": "Job not found"}` |
| OCR failed | 500 | `{"error": "...", "fallback_result": {...}}` |
| Cloud quota exceeded | 503 | `{"error": "Cloud OCR unavailable", "fallback_result": {...}}` |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_CLOUD_PROVIDER` | `auto` | Cloud provider: auto, aws, google, azure, none |
| `OCR_CONFIDENCE_THRESHOLD` | `0.85` | Minimum Tesseract confidence before cloud fallback |
| `OCR_MAX_FILE_SIZE` | `52428800` | Max PDF size in bytes (50MB) |
| `OCR_MAX_PAGES` | `50` | Max pages per PDF |
| `OCR_JOB_TTL` | `3600` | Job result TTL in seconds |
| `AWS_ACCESS_KEY_ID` | - | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | - | AWS credentials |
| `AWS_REGION` | `us-east-1` | AWS region |
| `GOOGLE_APPLICATION_CREDENTIALS` | - | Path to GCP service account JSON |
| `AZURE_CV_ENDPOINT` | - | Azure Computer Vision endpoint |
| `AZURE_CV_KEY` | - | Azure Computer Vision key |

## Testing Strategy

1. **Unit Tests**
   - Detector logic (text vs scanned detection)
   - Each OCR provider adapter
   - Confidence scoring

2. **Integration Tests**
   - Full OCR pipeline with sample PDFs
   - Job lifecycle (create → poll → complete)
   - Provider fallback behavior

3. **Test PDFs**
   - `test_text_based.pdf` - Clean Word export
   - `test_scanned_clean.pdf` - High quality scan
   - `test_scanned_noisy.pdf` - Low quality scan
   - `test_handwritten.pdf` - Handwritten content
   - `test_mixed.pdf` - Text + scanned images

## Future Considerations (Kafka Migration)

When ready for Kafka:

1. Add `kafka-python` or `aiokafka` dependency
2. Create `KafkaJobConsumer` alongside HTTP endpoints
3. Node.js publishes to `pdf-ocr-jobs` topic
4. Python consumes, processes, publishes result to `pdf-ocr-results`
5. Node.js consumes results or uses webhook callback

The adapter pattern and job manager design make this migration straightforward.
