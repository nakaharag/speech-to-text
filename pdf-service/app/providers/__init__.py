"""OCR providers package."""
from app.providers.base import OCRProvider, OCRResult
from app.providers.tesseract import TesseractProvider

__all__ = ["OCRProvider", "OCRResult", "TesseractProvider"]
