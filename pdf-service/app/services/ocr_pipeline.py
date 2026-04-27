"""OCR pipeline orchestration."""
import time
from dataclasses import dataclass
from typing import Optional, Callable
import fitz
from PIL import Image
from pdf2image import convert_from_bytes
from app.providers.tesseract import TesseractProvider
from app.services.detector import PDFDetector
from app.services.text_corrector import PortugueseTextCorrector

# Increase PIL's pixel limit to handle large scanned PDFs
Image.MAX_IMAGE_PIXELS = 200000000  # 200 million pixels


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
        self.text_corrector = PortugueseTextCorrector()

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

        # Convert PDF to images (150 DPI is enough for OCR, faster than 300)
        images = convert_from_bytes(pdf_bytes, dpi=150)

        for i, image in enumerate(images):
            if progress_callback:
                progress = int((i / len(images)) * 100)
                progress_callback(progress)

            # Resize if image is too large (max 4000px on longest side)
            max_dimension = 4000
            if image.width > max_dimension or image.height > max_dimension:
                ratio = min(max_dimension / image.width, max_dimension / image.height)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

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

        # Apply Portuguese text correction if needed
        corrected_text = self.text_corrector.correct_ocr_output(full_text, language)

        return PipelineResult(
            text=corrected_text,
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
