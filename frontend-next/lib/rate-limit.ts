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

// SECURITY: Trusted proxy IP ranges that are allowed to set X-Forwarded-For.
// Only trust forwarded headers when the direct connection comes from these IPs.
// This prevents IP spoofing attacks where attackers set fake X-Forwarded-For headers.
const TRUSTED_PROXIES = [
  '127.0.0.1',
  '::1',
  'localhost',
  // Docker internal networks
  '172.16.0.0/12',
  '10.0.0.0/8',
  '192.168.0.0/16',
];

function isFromTrustedProxy(directIp: string | null): boolean {
  if (!directIp) return false;

  // Normalize IPv6-mapped IPv4 addresses (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
  const normalizedIp = directIp.replace(/^::ffff:/, '');

  for (const trusted of TRUSTED_PROXIES) {
    if (trusted.includes('/')) {
      // CIDR notation - check if IP is in range
      if (isIpInCidr(normalizedIp, trusted)) return true;
    } else {
      if (normalizedIp === trusted) return true;
    }
  }
  return false;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  // Only handle IPv4 for simplicity
  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');

  // Get the direct connection IP (set by the server/framework)
  // In Next.js, this is typically available via x-real-ip when behind a proxy
  // or we fall back to 'unknown' if not available
  const directIp = realIp || 'unknown';

  // SECURITY: Only trust X-Forwarded-For if the request comes from a trusted proxy.
  // This prevents attackers from spoofing their IP by setting a fake X-Forwarded-For header.
  if (forwarded && isFromTrustedProxy(directIp)) {
    return forwarded.split(',')[0].trim();
  }

  // If not from a trusted proxy or no forwarded header, use the direct connection IP
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
