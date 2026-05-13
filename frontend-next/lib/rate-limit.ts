import { headers } from 'next/headers';

interface RateLimitRecord {
  count: number;
  firstRequest: number;
}

// In-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxAttempts: number;  // Max attempts in window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 5 },      // 5 per 15 min
  signup: { windowMs: 60 * 60 * 1000, maxAttempts: 3 },     // 3 per hour
  'password-reset': { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
};

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(action: keyof typeof RATE_LIMITS, identifier?: string): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }

  const ip = await getClientIp();
  const key = `${action}:${identifier || ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  // No record or window expired - allow and start new window
  if (!record || now - record.firstRequest > config.windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  // Within window - check count
  if (record.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.firstRequest + config.windowMs),
    };
  }

  // Increment and allow
  record.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetAt: new Date(record.firstRequest + config.windowMs),
  };
}

// Cleanup old entries periodically (call from a cron or on each request)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstRequest > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
