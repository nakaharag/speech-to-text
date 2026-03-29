import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ShareService } from '../services/share.service';
import { CreateShareDto } from '../dto/create-share.dto';

@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('create')
  async createShare(@Body() dto: CreateShareDto) {
    if (!dto.transcript || dto.transcript.trim().length === 0) {
      throw new HttpException('Transcript is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.shareService.createShare(
        dto.transcript,
        dto.summary || '',
      );
      return result;
    } catch (error) {
      const err = error as Error;
      throw new HttpException(
        err.message || 'Failed to create share link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getShare(@Param('id') id: string) {
    try {
      const share = await this.shareService.getShare(id);
      return share;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotFoundException') {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        err.message || 'Failed to get share',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
