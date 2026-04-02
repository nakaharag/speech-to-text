import { Module, OnModuleInit } from '@nestjs/common';
import { SpeechController } from './controllers/speech.controller';
import { ContentController } from './controllers/content.controller';
import { ShareController } from './controllers/share.controller';
import { LanguageController } from './controllers/language.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { SpeechService } from './services/speech.service';
import { ClaudeService } from './services/claude.service';
import { ShareService } from './services/share.service';
import { RateLimitService } from './services/rate-limit.service';
import { PrismaService } from './services/prisma.service';
import { LanguageService } from './services/language.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [],
  controllers: [
    SpeechController,
    ContentController,
    ShareController,
    LanguageController,
    AnalyticsController,
  ],
  providers: [
    PrismaService,
    SpeechService,
    ClaudeService,
    ShareService,
    RateLimitService,
    LanguageService,
    AnalyticsService,
  ],
  exports: [PrismaService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private shareService: ShareService,
    private rateLimitService: RateLimitService,
  ) {}

  async onModuleInit() {
    // Run cleanup on startup
    await this.shareService.cleanupExpired();
    await this.rateLimitService.cleanupOldEntries();

    // Schedule periodic cleanup (every hour)
    setInterval(async () => {
      await this.shareService.cleanupExpired();
      await this.rateLimitService.cleanupOldEntries();
    }, 60 * 60 * 1000);
  }
}
