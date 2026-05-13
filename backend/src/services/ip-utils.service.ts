import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Service for handling client IP address extraction with security measures.
 *
 * SECURITY: Only trusts X-Forwarded-For if the request comes from a trusted proxy.
 * This prevents IP spoofing attacks where attackers bypass rate limits by setting
 * fake X-Forwarded-For headers. We only trust forwarded headers when the direct
 * connection comes from localhost or internal network IPs.
 */
@Injectable()
export class IpUtilsService {
  /**
   * Extracts the real client IP address from the request.
   * Only trusts X-Forwarded-For headers when the direct connection is from a trusted proxy.
   */
  getClientIp(req: Request): string {
    const directIp = req.socket.remoteAddress || req.ip || '';

    // Check if the direct connection is from a trusted proxy
    if (this.isFromTrustedProxy(directIp)) {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      if (Array.isArray(forwarded)) {
        return forwarded[0];
      }
    }

    // Not from trusted proxy - use direct connection IP
    return directIp || 'unknown';
  }

  /**
   * Checks if an IP address is from a trusted proxy (localhost or private network ranges).
   */
  isFromTrustedProxy(ip: string): boolean {
    // Normalize IPv6-mapped IPv4 addresses (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    const normalizedIp = ip.replace(/^::ffff:/, '');

    // Trusted proxy IPs: localhost and private network ranges
    const trustedPatterns = [
      '127.0.0.1',
      '::1',
      'localhost',
    ];

    // Check exact matches
    if (trustedPatterns.includes(normalizedIp)) return true;

    // Check private network ranges (Docker, internal networks)
    const parts = normalizedIp.split('.').map(Number);
    if (parts.length === 4) {
      // 10.0.0.0/8
      if (parts[0] === 10) return true;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
    }

    return false;
  }
}
