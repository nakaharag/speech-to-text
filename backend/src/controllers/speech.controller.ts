import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Req,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from '../services/speech.service';
import { RateLimitService } from '../services/rate-limit.service';
import { Request } from 'express';

@Controller('speech')
export class SpeechController {
  constructor(
    private readonly speechService: SpeechService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('language') language?: string,
  ) {
    // Get client IP
    const ip = this.getClientIp(req);

    // Check rate limit (now async)
    const limit = await this.rateLimitService.checkLimit(ip);
    if (!limit.allowed) {
      throw new HttpException(
        {
          error: 'Rate limit exceeded',
          message: 'You have reached the daily limit of 5 transcriptions. Please try again tomorrow.',
          remaining: 0,
          resetAt: limit.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!file) {
      throw new HttpException('No audio file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.speechService.transcribeAudio(file.buffer, {
        language: language || undefined,
      });

      // Increment count after successful transcription
      await this.rateLimitService.incrementCount(ip);
      const remaining = await this.rateLimitService.getRemainingRequests(ip);

      return {
        transcription: result.text,
        language: result.language,
        remaining,
      };
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Transcription failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB max
    },
  }))
  async uploadAndTranscribe(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('language') language?: string,
  ) {
    // Get client IP
    const ip = this.getClientIp(req);

    // Check rate limit
    const limit = await this.rateLimitService.checkLimit(ip);
    if (!limit.allowed) {
      throw new HttpException(
        {
          error: 'Rate limit exceeded',
          message: 'You have reached the daily limit of 5 transcriptions. Please try again tomorrow.',
          remaining: 0,
          resetAt: limit.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!file) {
      throw new HttpException('No audio file provided', HttpStatus.BAD_REQUEST);
    }

    // Validate file type
    const allowedMimeTypes = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/flac',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        `Unsupported audio format: ${file.mimetype}. Supported formats: MP3, WAV, M4A, WEBM, OGG, FLAC`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.speechService.transcribeAudio(file.buffer, {
        language: language || undefined,
      });

      // Increment count after successful transcription
      await this.rateLimitService.incrementCount(ip);
      const remaining = await this.rateLimitService.getRemainingRequests(ip);

      return {
        transcription: result.text,
        language: result.language,
        fileName: file.originalname,
        fileSize: file.size,
        remaining,
      };
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Transcription failed',
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
}
