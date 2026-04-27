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
