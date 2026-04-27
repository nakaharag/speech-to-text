"""Tests for Tesseract provider."""
import pytest
from PIL import Image, ImageDraw
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
