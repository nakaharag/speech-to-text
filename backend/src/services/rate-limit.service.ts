import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface RateLimitData {
  [ip: string]: {
    count: number;
    resetAt: string;
  };
}

@Injectable()
export class RateLimitService implements OnModuleInit {
  private readonly dataDir = path.join(process.cwd(), 'data', 'rate-limits');
  private readonly dataFile: string;
  private readonly maxRequests = 5; // 5 requests per day
  private data: RateLimitData = {};

  constructor() {
    this.dataFile = path.join(this.dataDir, 'limits.json');
  }

  onModuleInit() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadData();
    this.cleanupExpired();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        this.data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
      }
    } catch {
      this.data = {};
    }
  }

  private saveData(): void {
    fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
  }

  private getResetTime(): Date {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(24, 0, 0, 0); // Next midnight UTC
    return resetTime;
  }

  private cleanupExpired(): void {
    const now = new Date();
    let changed = false;

    for (const ip of Object.keys(this.data)) {
      if (new Date(this.data[ip].resetAt) < now) {
        delete this.data[ip];
        changed = true;
      }
    }

    if (changed) {
      this.saveData();
    }
  }

  checkLimit(ip: string): { allowed: boolean; remaining: number; resetAt: string } {
    const now = new Date();
    const entry = this.data[ip];

    // If no entry or entry has expired, reset
    if (!entry || new Date(entry.resetAt) < now) {
      const resetAt = this.getResetTime().toISOString();
      this.data[ip] = { count: 0, resetAt };
      this.saveData();
    }

    const remaining = this.maxRequests - this.data[ip].count;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetAt: this.data[ip].resetAt,
    };
  }

  incrementCount(ip: string): void {
    if (this.data[ip]) {
      this.data[ip].count++;
      this.saveData();
    }
  }

  getRemainingRequests(ip: string): number {
    const result = this.checkLimit(ip);
    return result.remaining;
  }
}
