import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

export interface ShareData {
  id: string;
  shortId: string;
  transcript: string;
  corrected: string | null;
  summary: string | null;
  language: string | null;
  audioKey: string | null;
  ownerTier: string | null;
  hasPassword: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface CreateShareInput {
  transcript: string;
  corrected?: string;
  summary?: string;
  language?: string;
  password?: string;
  expiration?: '24h' | '7d' | '30d' | 'never';
  audioKey?: string;
  userId?: string;
  userTier?: string;
}

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  private getExpirationDate(expiration: string | undefined, userTier: string): Date | null {
    // Default expiration is 7 days
    const now = new Date();

    switch (expiration) {
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'never':
        // Only Pro and Enterprise users can have no expiration
        if (userTier === 'pro' || userTier === 'enterprise') {
          return null;
        }
        // Fall back to 30d for non-pro users trying to use 'never'
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        // Default: 7 days
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  async createShare(input: CreateShareInput): Promise<{ id: string; shortId: string; url: string }> {
    // Use 16 character nanoid for better security
    const shortId = nanoid(16);
    const userTier = input.userTier || 'free';
    const expiresAt = this.getExpirationDate(input.expiration, userTier);

    // Hash password if provided
    let passwordHash: string | null = null;
    if (input.password && input.password.length > 0) {
      passwordHash = await bcrypt.hash(input.password, 10);
    }

    const share = await this.prisma.share.create({
      data: {
        shortId,
        transcript: input.transcript,
        corrected: input.corrected || null,
        summary: input.summary || null,
        language: input.language || null,
        passwordHash,
        ownerTier: userTier,
        audioKey: input.audioKey || null,
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

    // Check if expired (only if expiresAt is set)
    if (share.expiresAt && share.expiresAt < new Date()) {
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
      audioKey: share.audioKey,
      ownerTier: share.ownerTier,
      hasPassword: !!share.passwordHash,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    };
  }

  async getShareMetadata(shortId: string): Promise<{
    hasPassword: boolean;
    ownerTier: string | null;
    expiresAt: Date | null;
  }> {
    const share = await this.prisma.share.findUnique({
      where: { shortId },
      select: {
        passwordHash: true,
        ownerTier: true,
        expiresAt: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share has expired');
    }

    return {
      hasPassword: !!share.passwordHash,
      ownerTier: share.ownerTier,
      expiresAt: share.expiresAt,
    };
  }

  async verifyPassword(shortId: string, password: string): Promise<boolean> {
    const share = await this.prisma.share.findUnique({
      where: { shortId },
      select: {
        passwordHash: true,
        expiresAt: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share has expired');
    }

    // If no password is set, anyone can access
    if (!share.passwordHash) {
      return true;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, share.passwordHash);
    if (!isValid) {
      throw new ForbiddenException('Invalid password');
    }

    return true;
  }

  async getShareContent(shortId: string, skipPasswordCheck = false): Promise<ShareData> {
    const share = await this.prisma.share.findUnique({
      where: { shortId },
    });

    if (!share) {
      throw new NotFoundException('Share not found or has expired');
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      await this.prisma.share.delete({ where: { id: share.id } });
      throw new NotFoundException('Share has expired');
    }

    // If password protected and not skipping check, require authentication
    if (share.passwordHash && !skipPasswordCheck) {
      throw new ForbiddenException('Password required');
    }

    return {
      id: share.id,
      shortId: share.shortId,
      transcript: share.transcript,
      corrected: share.corrected,
      summary: share.summary,
      language: share.language,
      audioKey: share.audioKey,
      ownerTier: share.ownerTier,
      hasPassword: !!share.passwordHash,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    };
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.share.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
      },
    });

    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired shares`);
    }

    return result.count;
  }
}
