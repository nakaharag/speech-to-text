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
