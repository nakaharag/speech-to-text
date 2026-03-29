import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClaudeService } from '../services/claude.service';
import { SummarizeDto } from '../dto/summarize.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly claudeService: ClaudeService) {}

  @Post('summarize')
  async summarize(@Body() dto: SummarizeDto) {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new HttpException('Text is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.claudeService.processTranscript(dto.text);
      return {
        correctedTranscript: result.correctedTranscript,
        summary: result.summary,
      };
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Summarization failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
