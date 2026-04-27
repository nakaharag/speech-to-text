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
