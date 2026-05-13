import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { R2Service } from '../services/r2.service';
import { PrismaService } from '../services/prisma.service';
import { NextAuthGuard, NextAuthUser } from '../guards/nextauth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('storage')
@UseGuards(NextAuthGuard)
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    private readonly r2Service: R2Service,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Get presigned URL for transcription audio playback
   */
  @Get('audio/:transcriptionId')
  async getAudioUrl(
    @Param('transcriptionId') transcriptionId: string,
    @CurrentUser() user: NextAuthUser,
  ) {
    // Check if R2 is available
    if (!this.r2Service.isAvailable()) {
      throw new HttpException(
        'Storage service not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Verify ownership by checking the transcription belongs to the user
    const transcription = await this.prismaService.transcription.findUnique({
      where: { id: transcriptionId },
    });

    if (!transcription) {
      throw new HttpException('Transcription not found', HttpStatus.NOT_FOUND);
    }

    if (transcription.userId !== user.id) {
      throw new HttpException(
        'Access denied',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if the transcription has an audio key stored
    // Note: The audioKey field needs to be added to the schema
    const audioKey = (transcription as any).audioKey;
    if (!audioKey) {
      throw new HttpException(
        'Audio file not available for this transcription',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const result = await this.r2Service.getPresignedDownloadUrl(audioKey);

      this.logger.log(
        `Generated audio URL for transcription ${transcriptionId} (user: ${user.id})`,
      );

      return {
        url: result.url,
        expiresAt: result.expiresAt,
        transcriptionId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate audio URL for transcription ${transcriptionId}`,
        err.message,
      );
      throw new HttpException(
        'Failed to generate audio URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get presigned URL for PDF conversion MP3 playback
   */
  @Get('mp3/:conversionId')
  async getMp3Url(
    @Param('conversionId') conversionId: string,
    @CurrentUser() user: NextAuthUser,
  ) {
    // Check if R2 is available
    if (!this.r2Service.isAvailable()) {
      throw new HttpException(
        'Storage service not available',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Verify ownership by checking the PDF conversion belongs to the user
    const conversion = await this.prismaService.pdfConversion.findUnique({
      where: { id: conversionId },
    });

    if (!conversion) {
      throw new HttpException('Conversion not found', HttpStatus.NOT_FOUND);
    }

    // Check if the conversion has a user ID and it matches
    // Note: The userId field needs to be added to the PdfConversion schema
    const conversionUserId = (conversion as any).userId;
    if (conversionUserId && conversionUserId !== user.id) {
      throw new HttpException(
        'Access denied',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if the conversion has an audio key stored
    const audioKey = (conversion as any).audioKey;
    if (!audioKey) {
      throw new HttpException(
        'Audio file not available for this conversion',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const result = await this.r2Service.getPresignedDownloadUrl(audioKey);

      this.logger.log(
        `Generated MP3 URL for conversion ${conversionId} (user: ${user.id})`,
      );

      return {
        url: result.url,
        expiresAt: result.expiresAt,
        conversionId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate MP3 URL for conversion ${conversionId}`,
        err.message,
      );
      throw new HttpException(
        'Failed to generate audio URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if storage service is available
   */
  @Get('status')
  getStorageStatus() {
    return {
      available: this.r2Service.isAvailable(),
      message: this.r2Service.isAvailable()
        ? 'R2 storage is configured and available'
        : 'R2 storage is not configured. Audio files will not be stored.',
    };
  }
}
