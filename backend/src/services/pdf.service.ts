import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  needsOcr: boolean;
  metadata?: {
    title?: string;
    author?: string;
  };
}

@Injectable()
export class PdfService {
  private readonly MAX_PAGES = 20;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
      throw new Error('This appears to be a scanned PDF. OCR support is not available yet. Please upload a text-based PDF.');
    }

    if (text.length < 10) {
      throw new Error('No readable text found in PDF');
    }

    return {
      text,
      pageCount,
      needsOcr,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
      },
    };
  }

  getMaxPages(): number {
    return this.MAX_PAGES;
  }

  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }
}
