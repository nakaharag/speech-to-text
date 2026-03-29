import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

export interface ShareData {
  id: string;
  transcript: string;
  summary: string;
  createdAt: string;
  expiresAt: string;
}

@Injectable()
export class ShareService implements OnModuleInit {
  private readonly dataDir = path.join(process.cwd(), 'data', 'shares');

  onModuleInit() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.cleanupExpired();
  }

  async createShare(transcript: string, summary: string): Promise<{ id: string; url: string }> {
    const id = nanoid(6);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const shareData: ShareData = {
      id,
      transcript,
      summary,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const filePath = path.join(this.dataDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(shareData, null, 2));

    const baseUrl = process.env.BASE_URL || 'https://speech-to-text.me';
    return {
      id,
      url: `${baseUrl}/s/${id}`,
    };
  }

  async getShare(id: string): Promise<ShareData> {
    const filePath = path.join(this.dataDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Share not found or has expired');
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ShareData;

    // Check if expired
    if (new Date(data.expiresAt) < new Date()) {
      fs.unlinkSync(filePath);
      throw new NotFoundException('Share has expired');
    }

    return data;
  }

  private cleanupExpired(): void {
    try {
      const files = fs.readdirSync(this.dataDir);
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.dataDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ShareData;
          if (new Date(data.expiresAt) < now) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up expired share: ${file}`);
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch (err) {
      console.error('Error cleaning up expired shares:', err);
    }
  }
}
