import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Req,
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
  ) {
    // Get client IP
    const ip = this.getClientIp(req);

    // Check rate limit
    const limit = this.rateLimitService.checkLimit(ip);
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
      const transcription = await this.speechService.transcribeAudio(file.buffer);

      // Increment count after successful transcription
      this.rateLimitService.incrementCount(ip);
      const remaining = this.rateLimitService.getRemainingRequests(ip);

      return {
        transcription,
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
