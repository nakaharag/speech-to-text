import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface AnalyticsEvent {
  shareId: string;
  eventType: 'view' | 'copy_transcript' | 'copy_link' | 'share_twitter' | 'share_facebook' | 'share_whatsapp';
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

export interface ShareStats {
  totalViews: number;
  totalCopies: number;
  totalShares: number;
  eventBreakdown: { [key: string]: number };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.prisma.shareAnalytics.create({
        data: {
          shareId: event.shareId,
          eventType: event.eventType,
          ipAddress: event.ipAddress || null,
          userAgent: event.userAgent || null,
          referer: event.referer || null,
        },
      });
    } catch (error) {
      // Log but don't throw - analytics should not break main flow
      console.error('Failed to track analytics event:', error);
    }
  }

  async getShareStats(shareId: string): Promise<ShareStats> {
    const events = await this.prisma.shareAnalytics.groupBy({
      by: ['eventType'],
      where: { shareId },
      _count: { eventType: true },
    });

    const eventBreakdown: { [key: string]: number } = {};
    let totalViews = 0;
    let totalCopies = 0;
    let totalShares = 0;

    for (const event of events) {
      eventBreakdown[event.eventType] = event._count.eventType;

      if (event.eventType === 'view') {
        totalViews = event._count.eventType;
      } else if (event.eventType.startsWith('copy_')) {
        totalCopies += event._count.eventType;
      } else if (event.eventType.startsWith('share_')) {
        totalShares += event._count.eventType;
      }
    }

    return {
      totalViews,
      totalCopies,
      totalShares,
      eventBreakdown,
    };
  }

  async getRecentEvents(shareId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.shareAnalytics.findMany({
      where: { shareId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        eventType: true,
        createdAt: true,
        referer: true,
      },
    });
  }

  async getGlobalStats(): Promise<{
    totalShares: number;
    totalViews: number;
    last24Hours: {
      shares: number;
      views: number;
    };
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalShares, totalViews, recentShares, recentViews] = await Promise.all([
      this.prisma.share.count(),
      this.prisma.shareAnalytics.count({ where: { eventType: 'view' } }),
      this.prisma.share.count({ where: { createdAt: { gte: yesterday } } }),
      this.prisma.shareAnalytics.count({
        where: { eventType: 'view', createdAt: { gte: yesterday } },
      }),
    ]);

    return {
      totalShares,
      totalViews,
      last24Hours: {
        shares: recentShares,
        views: recentViews,
      },
    };
  }
}
