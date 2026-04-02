import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ShareService } from '../services/share.service';
import { AnalyticsService } from '../services/analytics.service';
import { CreateShareDto } from '../dto/create-share.dto';
import { Request } from 'express';

@Controller('share')
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('create')
  async createShare(@Body() dto: CreateShareDto) {
    if (!dto.transcript || dto.transcript.trim().length === 0) {
      throw new HttpException('Transcript is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.shareService.createShare({
        transcript: dto.transcript,
        corrected: dto.corrected,
        summary: dto.summary,
        language: dto.language,
      });
      return result;
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Failed to create share link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getShare(@Param('id') id: string, @Req() req: Request) {
    try {
      const share = await this.shareService.getShare(id);

      // Track view event
      await this.analyticsService.trackEvent({
        shareId: share.id,
        eventType: 'view',
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'] as string,
      });

      return share;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotFoundException') {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        err.message || 'Failed to get share',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/stats')
  async getShareStats(@Param('id') id: string) {
    try {
      // Verify share exists
      const share = await this.shareService.getShare(id);
      const stats = await this.analyticsService.getShareStats(share.id);
      return stats;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotFoundException') {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        err.message || 'Failed to get share stats',
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
