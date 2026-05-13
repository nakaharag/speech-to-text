import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../services/prisma.service';

export interface NextAuthUser {
  id: string;
  email: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

@Injectable()
export class NextAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    // Note: X-User-Tier header is intentionally IGNORED for security
    // The tier is always fetched from the database to prevent tier forgery attacks

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // SECURITY: Fetch user from database to get authoritative tier
    // Never trust client-provided tier information
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    // Use database tier, fallback to 'free' if user not found
    const authoritiveTier = (dbUser?.tier as NextAuthUser['tier']) || 'free';

    // Attach user to request for later use
    (request as any).user = {
      id: userId,
      email: userEmail || '',
      tier: authoritiveTier,
    };

    return true;
  }
}

@Injectable()
export class OptionalNextAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    // Note: X-User-Tier header is intentionally IGNORED for security
    // The tier is always fetched from the database to prevent tier forgery attacks

    if (userId) {
      // SECURITY: Fetch user from database to get authoritative tier
      // Never trust client-provided tier information
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });

      // Use database tier, fallback to 'free' if user not found
      const authoritiveTier = (dbUser?.tier as NextAuthUser['tier']) || 'free';

      (request as any).user = {
        id: userId,
        email: userEmail || '',
        tier: authoritiveTier,
      };
    }

    return true; // Always allow, user is optional
  }
}
