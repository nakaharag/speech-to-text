import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  needsOcr: boolean;
  usedOcr: boolean;
  ocrConfidence?: number;
  metadata?: {
    title?: string;
    author?: string;
  };
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly MAX_PAGES = 20;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly OCR_SERVICE_URL = 'http://pdf-service:8000';
  private readonly OCR_POLL_INTERVAL = 2000; // 2 seconds
  private readonly OCR_MAX_WAIT = 300000; // 5 minutes for large PDFs

  validatePdf(buffer: Buffer): { valid: boolean; error?: string } {
    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'PDF exceeds 10MB limit' };
    }

    // Check PDF magic bytes (%PDF-)
    const header = buffer.slice(0, 5).toString();
    if (header !== '%PDF-') {
      return { valid: false, error: 'File is not a valid PDF' };
    }

    return { valid: true };
  }

  async extractText(buffer: Buffer): Promise<PdfExtractResult> {
    const validation = this.validatePdf(buffer);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Use pdf-parse v1.x simple API
    const data = await pdfParse(buffer);

    const pageCount = data.numpages || 1;

    // Check page limit
    if (pageCount > this.MAX_PAGES) {
      throw new Error(`PDF exceeds ${this.MAX_PAGES} page limit (has ${pageCount} pages)`);
    }

    const text = data.text?.trim() || '';

    // Detect if PDF likely needs OCR (scanned document)
    const avgCharsPerPage = text.length / pageCount;
    const needsOcr = avgCharsPerPage < 100;

    if (needsOcr) {
      // Use OCR microservice for scanned PDFs
      this.logger.log('PDF needs OCR, forwarding to OCR service...');
      const ocrResult = await this.extractWithOcr(buffer);
      return {
        text: ocrResult.text,
        pageCount: ocrResult.pages,
        needsOcr: true,
        usedOcr: true,
        ocrConfidence: ocrResult.confidence,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
        },
      };
    }

    if (text.length < 10) {
      throw new Error('No readable text found in PDF');
    }

    return {
      text,
      pageCount,
      needsOcr,
      usedOcr: false,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
      },
    };
  }

  private async extractWithOcr(buffer: Buffer): Promise<{
    text: string;
    pages: number;
    confidence: number;
    method: string;
  }> {
    // Submit PDF to OCR service
    const formData = new FormData();
    const uint8Array = new Uint8Array(buffer);
    formData.append('file', new Blob([uint8Array]), 'document.pdf');

    const submitResponse = await fetch(`${this.OCR_SERVICE_URL}/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json().catch(() => ({}));
      throw new Error(error.detail || 'OCR service failed to accept PDF');
    }

    const { job_id } = await submitResponse.json();
    this.logger.log(`OCR job submitted: ${job_id}`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < this.OCR_MAX_WAIT) {
      await this.sleep(this.OCR_POLL_INTERVAL);

      const statusResponse = await fetch(`${this.OCR_SERVICE_URL}/jobs/${job_id}`);
      if (!statusResponse.ok) {
        throw new Error('Failed to check OCR job status');
      }

      const status = await statusResponse.json();
      this.logger.log(`OCR job ${job_id} status: ${status.status}`);

      if (status.status === 'completed' && status.result) {
        return {
          text: status.result.text,
          pages: status.result.pages,
          confidence: status.result.confidence,
          method: status.result.method,
        };
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'OCR processing failed');
      }
    }

    throw new Error('OCR processing timed out');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getMaxPages(): number {
    return this.MAX_PAGES;
  }

  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }
}
