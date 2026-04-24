import {
  Controller,
  Post,
  Get,
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
import { getPreviewText, getVoiceDescription, TtsVoice as VoiceType } from '../constants/voice-previews';
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

    try {
      // Create conversion record
      await this.prisma.pdfConversion.create({
        data: {
          shortId,
          status: 'extracting',
          fileName: file.originalname,
          fileSize: file.size,
          voice: validVoice,
          ipAddress: ip,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Extract text from PDF
      const extraction = await this.pdfService.extractText(file.buffer);

      // Update status
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
        {
          voice: validVoice as TtsVoice,
          speed: validSpeed,
        },
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

      // Increment rate limit
      await this.rateLimitService.incrementCount(ip);
      const remaining = await this.rateLimitService.getRemainingRequests(ip);

      return {
        success: true,
        jobId: shortId,
        fileName: file.originalname,
        pageCount: extraction.pageCount,
        textLength: extraction.text.length,
        estimatedDuration: ttsResult.duration,
        audioSize: ttsResult.audio.length,
        chunks: ttsResult.chunks,
        remaining,
        downloadUrl: `/pdf/download/${shortId}`,
        // Include base64 audio for immediate playback
        audio: ttsResult.audio.toString('base64'),
      };
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

      // Return appropriate error status
      if (
        err.message.includes('limit') ||
        err.message.includes('exceeds') ||
        err.message.includes('scanned') ||
        err.message.includes('No readable')
      ) {
        throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        err.message || 'Conversion failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
  async getStatus(@Param('jobId') jobId: string) {
    const conversion = await this.prisma.pdfConversion.findUnique({
      where: { shortId: jobId },
    });

    if (!conversion) {
      throw new HttpException('Conversion not found', HttpStatus.NOT_FOUND);
    }

    return {
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
    };
  }

  @Get('voices')
  getVoices(@Req() req: Request) {
    const lang = (req.query.lang as string) || 'en';
    const voices = this.ttsService.getAvailableVoices();

    // Translate descriptions based on language
    const translatedVoices = voices.map((voice) => ({
      ...voice,
      description: getVoiceDescription(voice.id as VoiceType, lang),
    }));

    return {
      voices: translatedVoices,
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
