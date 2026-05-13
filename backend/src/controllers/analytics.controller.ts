import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { IpUtilsService } from '../services/ip-utils.service';
import { TrackEventDto } from '../dto/track-event.dto';
import { Request } from 'express';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly ipUtilsService: IpUtilsService,
  ) {}

  @Post('track')
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    try {
      await this.analyticsService.trackEvent({
        shareId: dto.shareId,
        eventType: dto.eventType,
        ipAddress: this.ipUtilsService.getClientIp(req),
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'] as string,
      });
      return { success: true };
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Failed to track event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('global')
  async getGlobalStats() {
    try {
      const stats = await this.analyticsService.getGlobalStats();
      return stats;
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Failed to get global stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
