import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ShareService } from '../services/share.service';
import { AnalyticsService } from '../services/analytics.service';
import { CreateShareDto, VerifySharePasswordDto } from '../dto/create-share.dto';
import { Request } from 'express';

@Controller('share')
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('create')
  async createShare(
    @Body() dto: CreateShareDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-tier') userTier?: string,
  ) {
    if (!dto.transcript || dto.transcript.trim().length === 0) {
      throw new HttpException('Transcript is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.shareService.createShare({
        transcript: dto.transcript,
        corrected: dto.corrected,
        summary: dto.summary,
        language: dto.language,
        password: dto.password,
        expiration: dto.expiration,
        audioKey: dto.audioKey,
        userId: userId || undefined,
        userTier: userTier || 'free',
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
      if (err.name === 'NotFoundException' || err.message.includes('not found')) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        err.message || 'Failed to get share',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/metadata')
  async getShareMetadata(@Param('id') id: string) {
    try {
      return await this.shareService.getShareMetadata(id);
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotFoundException' || err.message.includes('not found')) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        err.message || 'Failed to get share metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/verify')
  async verifySharePassword(
    @Param('id') id: string,
    @Body() dto: VerifySharePasswordDto,
  ) {
    try {
      await this.shareService.verifyPassword(id, dto.password);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotFoundException' || err.message.includes('not found')) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      if (err.name === 'ForbiddenException' || err.message.includes('Invalid password')) {
        throw new HttpException('Invalid password', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        err.message || 'Failed to verify password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/content')
  async getShareContent(@Param('id') id: string, @Req() req: Request) {
    try {
      // Check for auth cookie in headers (passed from frontend)
      const authHeader = req.headers['x-share-auth'];
      const skipPasswordCheck = authHeader === 'true';

      const share = await this.shareService.getShareContent(id, skipPasswordCheck);

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
      if (err.name === 'NotFoundException' || err.message.includes('not found')) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      if (err.name === 'ForbiddenException' || err.message.includes('Password required')) {
        throw new HttpException('Password required', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        err.message || 'Failed to get share content',
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
      if (err.name === 'NotFoundException' || err.message.includes('not found')) {
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
