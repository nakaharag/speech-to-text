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
