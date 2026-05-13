import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface NextAuthUser {
  id: string;
  email: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

@Injectable()
export class NextAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const userTier = request.headers['x-user-tier'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Attach user to request for later use
    (request as any).user = {
      id: userId,
      email: userEmail || '',
      tier: (userTier as NextAuthUser['tier']) || 'free',
    };

    return true;
  }
}

@Injectable()
export class OptionalNextAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const userTier = request.headers['x-user-tier'] as string;

    if (userId) {
      (request as any).user = {
        id: userId,
        email: userEmail || '',
        tier: (userTier as NextAuthUser['tier']) || 'free',
      };
    }

    return true; // Always allow, user is optional
  }
}
