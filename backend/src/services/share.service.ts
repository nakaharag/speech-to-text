import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from './prisma.service';

export interface ShareData {
  id: string;
  shortId: string;
  transcript: string;
  corrected: string | null;
  summary: string | null;
  language: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateShareInput {
  transcript: string;
  corrected?: string;
  summary?: string;
  language?: string;
  userId?: string;
}

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  async createShare(input: CreateShareInput): Promise<{ id: string; shortId: string; url: string }> {
    const shortId = nanoid(6);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const share = await this.prisma.share.create({
      data: {
        shortId,
        transcript: input.transcript,
        corrected: input.corrected || null,
        summary: input.summary || null,
        language: input.language || null,
        expiresAt,
        userId: input.userId || null,
      },
    });

    const baseUrl = process.env.BASE_URL || 'https://speech-to-text.me';
    return {
      id: share.id,
      shortId: share.shortId,
      url: `${baseUrl}/s/${share.shortId}`,
    };
  }

  async getShare(shortId: string): Promise<ShareData> {
    const share = await this.prisma.share.findUnique({
      where: { shortId },
    });

    if (!share) {
      throw new NotFoundException('Share not found or has expired');
    }

    // Check if expired
    if (share.expiresAt < new Date()) {
      // Delete expired share
      await this.prisma.share.delete({ where: { id: share.id } });
      throw new NotFoundException('Share has expired');
    }

    return {
      id: share.id,
      shortId: share.shortId,
      transcript: share.transcript,
      corrected: share.corrected,
      summary: share.summary,
      language: share.language,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    };
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.share.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired shares`);
    }

    return result.count;
  }
}
