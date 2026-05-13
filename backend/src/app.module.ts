import { Module, OnModuleInit } from '@nestjs/common';
import { SpeechController } from './controllers/speech.controller';
import { ContentController } from './controllers/content.controller';
import { ShareController } from './controllers/share.controller';
import { LanguageController } from './controllers/language.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { HealthController } from './controllers/health.controller';
import { PdfController } from './controllers/pdf.controller';
import { ContactController } from './controllers/contact.controller';
import { StorageController } from './controllers/storage.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { UserController } from './controllers/user.controller';
import { SpeechService } from './services/speech.service';
import { ClaudeService } from './services/claude.service';
import { ShareService } from './services/share.service';
import { RateLimitService } from './services/rate-limit.service';
import { PrismaService } from './services/prisma.service';
import { LanguageService } from './services/language.service';
import { AnalyticsService } from './services/analytics.service';
import { PdfService } from './services/pdf.service';
import { TtsService } from './services/tts.service';
import { R2Service } from './services/r2.service';
import { StripeService } from './services/stripe.service';
import { IpUtilsService } from './services/ip-utils.service';
import {
  NextAuthGuard,
  OptionalNextAuthGuard,
} from './guards/nextauth.guard';

@Module({
  imports: [],
  controllers: [
    HealthController,
    SpeechController,
    ContentController,
    ShareController,
    LanguageController,
    AnalyticsController,
    PdfController,
    ContactController,
    StorageController,
    StripeWebhookController,
    UserController,
  ],
  providers: [
    PrismaService,
    SpeechService,
    ClaudeService,
    ShareService,
    RateLimitService,
    LanguageService,
    AnalyticsService,
    PdfService,
    TtsService,
    R2Service,
    StripeService,
    IpUtilsService,
    NextAuthGuard,
    OptionalNextAuthGuard,
  ],
  exports: [PrismaService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private shareService: ShareService,
    private rateLimitService: RateLimitService,
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  async onModuleInit() {
    // Run cleanup on startup
    await this.shareService.cleanupExpired();
    await this.rateLimitService.cleanupOldEntries();
    await this.cleanupExpiredPdfConversions();

    // Schedule periodic cleanup (every hour)
    setInterval(async () => {
      await this.shareService.cleanupExpired();
      await this.rateLimitService.cleanupOldEntries();
      await this.cleanupExpiredPdfConversions();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredPdfConversions() {
    try {
      // First, find expired conversions with R2 keys to delete from R2
      const expiredWithR2 = await this.prisma.pdfConversion.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          audioKey: {
            not: null,
          },
        },
        select: {
          id: true,
          audioKey: true,
        },
      });

      // Delete files from R2 if available
      if (expiredWithR2.length > 0 && this.r2Service.isAvailable()) {
        for (const conversion of expiredWithR2) {
          if (conversion.audioKey) {
            try {
              await this.r2Service.deleteFile(conversion.audioKey);
              console.log(`Deleted R2 file: ${conversion.audioKey}`);
            } catch (error) {
              console.error(
                `Failed to delete R2 file ${conversion.audioKey}:`,
                error,
              );
            }
          }
        }
      }

      // Then delete the database records
      const result = await this.prisma.pdfConversion.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired PDF conversions`);
      }
    } catch (error) {
      console.error('Error cleaning up PDF conversions:', error);
    }
  }
}
