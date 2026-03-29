import { Module } from '@nestjs/common';
import { SpeechController } from './controllers/speech.controller';
import { ContentController } from './controllers/content.controller';
import { ShareController } from './controllers/share.controller';
import { SpeechService } from './services/speech.service';
import { ClaudeService } from './services/claude.service';
import { ShareService } from './services/share.service';
import { RateLimitService } from './services/rate-limit.service';

@Module({
  imports: [],
  controllers: [
    SpeechController,
    ContentController,
    ShareController,
  ],
  providers: [
    SpeechService,
    ClaudeService,
    ShareService,
    RateLimitService,
  ],
})
export class AppModule {}
