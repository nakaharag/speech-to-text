import { Module } from '@nestjs/common';
import { SpeechService } from '@services/speech.service';
import { SpeechController } from '@controllers/speech.controller';
import { ReportController } from '@controllers/report.controller';

@Module({
  imports: [],
  controllers: [SpeechController, ReportController],
  providers: [SpeechService],
})
export class AppModule {}
