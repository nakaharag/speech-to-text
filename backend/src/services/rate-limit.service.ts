import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RateLimitService {
  private readonly maxRequests = 5; // 5 requests per day

  constructor(private prisma: PrismaService) {}

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(24, 0, 0, 0); // Next midnight UTC
    return resetTime;
  }

  async checkLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
    const today = this.getTodayDate();

    // Find or create rate limit entry for today
    let rateLimit = await this.prisma.rateLimit.findUnique({
      where: {
        ipAddress_date: {
          ipAddress: ip,
          date: today,
        },
      },
    });

    if (!rateLimit) {
      // Create new entry for today
      rateLimit = await this.prisma.rateLimit.create({
        data: {
          ipAddress: ip,
          date: today,
          count: 0,
        },
      });
    }

    const remaining = this.maxRequests - rateLimit.count;
    const resetAt = this.getResetTime().toISOString();

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetAt,
    };
  }

  async incrementCount(ip: string): Promise<void> {
    const today = this.getTodayDate();

    await this.prisma.rateLimit.upsert({
      where: {
        ipAddress_date: {
          ipAddress: ip,
          date: today,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        ipAddress: ip,
        date: today,
        count: 1,
      },
    });
  }

  async getRemainingRequests(ip: string): Promise<number> {
    const result = await this.checkLimit(ip);
    return result.remaining;
  }

  async cleanupOldEntries(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoffDate = yesterday.toISOString().split('T')[0];

    const result = await this.prisma.rateLimit.deleteMany({
      where: {
        date: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} old rate limit entries`);
    }

    return result.count;
  }
}
