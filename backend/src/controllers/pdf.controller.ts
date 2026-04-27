import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Req,
  Body,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { PdfService } from '../services/pdf.service';
import { TtsService, TtsVoice } from '../services/tts.service';
import { getPreviewText, getVoiceDescription, getRecommendedVoices, TtsVoice as VoiceType } from '../constants/voice-previews';
import { RateLimitService } from '../services/rate-limit.service';
import { PrismaService } from '../services/prisma.service';
import { nanoid } from 'nanoid';

@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly ttsService: TtsService,
    private readonly rateLimitService: RateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async convertPdfToAudio(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('voice') voice?: string,
    @Body('speed') speed?: string,
  ) {
    const ip = this.getClientIp(req);

    // Check rate limit
    const limit = await this.rateLimitService.checkLimit(ip);
    if (!limit.allowed) {
      throw new HttpException(
        {
          error: 'Rate limit exceeded',
          message: 'Daily conversion limit reached. Try again tomorrow.',
          remaining: 0,
          resetAt: limit.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!file) {
      throw new HttpException('No PDF file provided', HttpStatus.BAD_REQUEST);
    }

    // Validate file type
    if (
      file.mimetype !== 'application/pdf' &&
      !file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      throw new HttpException(
        'File must be a PDF document',
        HttpStatus.BAD_REQUEST,
      );
    }

    const shortId = nanoid(8);
    const validVoice = this.validateVoice(voice);
    const validSpeed = this.validateSpeed(speed);

    // Create conversion record
    await this.prisma.pdfConversion.create({
      data: {
        shortId,
        status: 'pending',
        fileName: file.originalname,
        fileSize: file.size,
        voice: validVoice,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Start background processing (don't await)
    this.processConversionInBackground(
      shortId,
      file.buffer,
      validVoice,
      validSpeed,
      ip,
    );

    // Return immediately with job ID
    const remaining = await this.rateLimitService.getRemainingRequests(ip);
    return {
      success: true,
      jobId: shortId,
      status: 'pending',
      fileName: file.originalname,
      remaining,
      message: 'Conversion started. Poll /pdf/status/:jobId for progress.',
    };
  }

  /**
   * Background processing for PDF conversion
   */
  private async processConversionInBackground(
    shortId: string,
    fileBuffer: Buffer,
    voice: TtsVoice,
    speed: number,
    ip: string,
  ) {
    try {
      // Update status to extracting
      await this.prisma.pdfConversion.update({
        where: { shortId },
        data: { status: 'extracting' },
      });

      // Extract text from PDF (may use OCR for scanned PDFs)
      const extraction = await this.pdfService.extractText(fileBuffer);

      // Update status with extracted text
      await this.prisma.pdfConversion.update({
        where: { shortId },
        data: {
          status: 'converting',
          extractedText: extraction.text,
          textLength: extraction.text.length,
          pageCount: extraction.pageCount,
        },
      });

      // Convert to audio
      const ttsResult = await this.ttsService.convertTextToSpeech(
        extraction.text,
        { voice, speed },
      );

      // Update completion
      await this.prisma.pdfConversion.update({
        where: { shortId },
        data: {
          status: 'completed',
          audioSize: ttsResult.audio.length,
          audioDuration: ttsResult.duration,
          audioFormat: 'mp3',
          completedAt: new Date(),
        },
      });

      // Increment rate limit only on success
      await this.rateLimitService.incrementCount(ip);

    } catch (error) {
      const err = error as Error;
      // Update failure status
      await this.prisma.pdfConversion
        .update({
          where: { shortId },
          data: {
            status: 'failed',
            errorMessage: err.message,
          },
        })
        .catch(() => {});
    }
  }

  @Get('download/:jobId')
  async downloadAudio(@Param('jobId') jobId: string, @Res() res: Response) {
    const conversion = await this.prisma.pdfConversion.findUnique({
      where: { shortId: jobId },
    });

    if (!conversion) {
      throw new HttpException('Conversion not found', HttpStatus.NOT_FOUND);
    }

    if (conversion.status !== 'completed') {
      throw new HttpException(
        `Conversion ${conversion.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (new Date() > conversion.expiresAt) {
      throw new HttpException('Conversion expired', HttpStatus.GONE);
    }

    if (!conversion.extractedText) {
      throw new HttpException('Audio not available', HttpStatus.NOT_FOUND);
    }

    // Regenerate audio (for MVP, we don't store audio files)
    const ttsResult = await this.ttsService.convertTextToSpeech(
      conversion.extractedText,
      {
        voice: (conversion.voice as TtsVoice) || 'alloy',
      },
    );

    const filename = conversion.fileName
      ? conversion.fileName.replace('.pdf', '.mp3')
      : 'audio.mp3';

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', ttsResult.audio.length);
    res.send(ttsResult.audio);
  }

  @Get('status/:jobId')
  async getStatus(
    @Param('jobId') jobId: string,
    @Req() req: Request,
  ) {
    const conversion = await this.prisma.pdfConversion.findUnique({
      where: { shortId: jobId },
    });

    if (!conversion) {
      throw new HttpException('Conversion not found', HttpStatus.NOT_FOUND);
    }

    const baseResponse = {
      jobId: conversion.shortId,
      status: conversion.status,
      fileName: conversion.fileName,
      pageCount: conversion.pageCount,
      textLength: conversion.textLength,
      audioDuration: conversion.audioDuration,
      audioSize: conversion.audioSize,
      voice: conversion.voice,
      errorMessage: conversion.errorMessage,
      createdAt: conversion.createdAt,
      completedAt: conversion.completedAt,
      expiresAt: conversion.expiresAt,
      downloadUrl: `/pdf/download/${conversion.shortId}`,
    };

    // If completed and audio requested, regenerate and include audio
    const includeAudio = req.query.includeAudio === 'true';
    if (conversion.status === 'completed' && includeAudio && conversion.extractedText) {
      try {
        const ttsResult = await this.ttsService.convertTextToSpeech(
          conversion.extractedText,
          { voice: (conversion.voice as TtsVoice) || 'alloy' },
        );
        return {
          ...baseResponse,
          audio: ttsResult.audio.toString('base64'),
          estimatedDuration: ttsResult.duration,
        };
      } catch (error) {
        // If audio generation fails, still return status
        return baseResponse;
      }
    }

    return baseResponse;
  }

  @Get('voices')
  getVoices(@Req() req: Request) {
    const lang = (req.query.lang as string) || 'en';
    const voices = this.ttsService.getAvailableVoices();
    const recommendedVoiceIds = getRecommendedVoices(lang);

    // Filter and translate voices based on language
    const filteredVoices = voices
      .filter((voice) => recommendedVoiceIds.includes(voice.id as VoiceType))
      .map((voice) => ({
        ...voice,
        description: getVoiceDescription(voice.id as VoiceType, lang),
      }));

    return {
      voices: filteredVoices,
    };
  }

  @Get('preview-voice/:voiceId')
  async previewVoice(
    @Param('voiceId') voiceId: string,
    @Req() req: Request,
  ) {
    const validVoice = this.validateVoice(voiceId);
    const lang = (req.query.lang as string) || 'en';
    const previewText = getPreviewText(validVoice, lang);

    try {
      const ttsResult = await this.ttsService.convertTextToSpeech(previewText, {
        voice: validVoice,
      });

      return {
        voice: validVoice,
        language: lang,
        audio: ttsResult.audio.toString('base64'),
      };
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Preview failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // OCR Endpoints - Forward to Python PDF service
  @Post('ocr')
  @UseInterceptors(FileInterceptor('file'))
  async submitOcrJob(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    // Forward to Python PDF service
    const formData = new FormData();
    const uint8Array = new Uint8Array(file.buffer);
    formData.append('file', new Blob([uint8Array]), file.originalname);

    try {
      const response = await fetch('http://pdf-service:8000/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new HttpException(
          error.detail || 'OCR service error',
          response.status,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('ocr/:jobId')
  async getOcrJobStatus(@Param('jobId') jobId: string) {
    try {
      const response = await fetch(`http://pdf-service:8000/jobs/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException('OCR service error', response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Delete('ocr/:jobId')
  async deleteOcrJob(@Param('jobId') jobId: string) {
    try {
      const response = await fetch(`http://pdf-service:8000/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        throw new HttpException('Failed to delete job', response.status);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'OCR service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private validateVoice(voice?: string): TtsVoice {
    const validVoices: TtsVoice[] = [
      'alloy',
      'echo',
      'fable',
      'onyx',
      'nova',
      'shimmer',
    ];
    if (voice && validVoices.includes(voice as TtsVoice)) {
      return voice as TtsVoice;
    }
    return 'alloy';
  }

  private validateSpeed(speed?: string): number {
    if (!speed) return 1.0;
    const parsed = parseFloat(speed);
    if (isNaN(parsed)) return 1.0;
    return Math.max(0.25, Math.min(4.0, parsed));
  }
}
