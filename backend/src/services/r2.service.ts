import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * R2 Storage paths:
 * - audio/{userId}/{transcriptionId}.webm - Transcribed audio files
 * - mp3/{userId}/{pdfConversionId}.mp3 - PDF conversion audio files
 * - temp/{uploadId}.tmp - Temporary upload files
 */
export type R2PathPrefix = 'audio' | 'mp3' | 'temp';

export interface R2UploadResult {
  key: string;
  size: number;
  etag?: string;
}

export interface R2PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string | null;
  private readonly isConfigured: boolean;

  // Presigned URL expiry in seconds (5 minutes)
  private readonly PRESIGNED_URL_EXPIRY = 5 * 60;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME || 'speech-to-text-storage';
    this.publicUrl = process.env.R2_PUBLIC_URL || null;

    // Check if R2 is configured
    this.isConfigured = !!(accountId && accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      });
      this.logger.log('R2 storage configured successfully');
    } else {
      this.client = null;
      this.logger.warn(
        'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.',
      );
    }
  }

  /**
   * Check if R2 storage is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Generate storage key for a file
   */
  generateKey(
    prefix: R2PathPrefix,
    userId: string,
    fileId: string,
    extension: string,
  ): string {
    // Sanitize inputs to prevent path traversal
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '');

    if (prefix === 'temp') {
      return `temp/${safeFileId}.${safeExtension}`;
    }

    return `${prefix}/${safeUserId}/${safeFileId}.${safeExtension}`;
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<R2UploadResult> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      const result = await this.client.send(command);

      this.logger.log(`Uploaded file to R2: ${key} (${data.length} bytes)`);

      return {
        key,
        size: data.length,
        etag: result.ETag,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload file to R2: ${key}`, err.message);
      throw new Error(`Failed to upload file: ${err.message}`);
    }
  }

  /**
   * Upload audio file from transcription
   */
  async uploadAudio(
    userId: string,
    transcriptionId: string,
    audioData: Buffer,
    format: 'webm' | 'mp3' | 'wav' = 'webm',
  ): Promise<R2UploadResult> {
    const contentTypeMap = {
      webm: 'audio/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    const key = this.generateKey('audio', userId, transcriptionId, format);
    return this.uploadFile(key, audioData, contentTypeMap[format]);
  }

  /**
   * Upload MP3 file from PDF conversion
   */
  async uploadMp3(
    userId: string,
    pdfConversionId: string,
    audioData: Buffer,
  ): Promise<R2UploadResult> {
    const key = this.generateKey('mp3', userId, pdfConversionId, 'mp3');
    return this.uploadFile(key, audioData, 'audio/mpeg');
  }

  /**
   * Upload temporary file
   */
  async uploadTemp(uploadId: string, data: Buffer): Promise<R2UploadResult> {
    const key = this.generateKey('temp', '', uploadId, 'tmp');
    return this.uploadFile(key, data, 'application/octet-stream');
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async getPresignedDownloadUrl(key: string): Promise<R2PresignedUrlResult> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: this.PRESIGNED_URL_EXPIRY,
      });

      const expiresAt = new Date(Date.now() + this.PRESIGNED_URL_EXPIRY * 1000);

      this.logger.log(`Generated presigned URL for: ${key}`);

      return {
        url,
        expiresAt,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate presigned URL for: ${key}`,
        err.message,
      );
      throw new Error(`Failed to generate download URL: ${err.message}`);
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      this.logger.log(`Deleted file from R2: ${key}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete file from R2: ${key}`, err.message);
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  }

  /**
   * Check if a file exists in R2
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      // NotFound error means file doesn't exist
      return false;
    }
  }

  /**
   * Extract userId and fileId from an R2 key
   * Useful for ownership verification
   */
  parseKey(key: string): { prefix: R2PathPrefix; userId?: string; fileId: string } | null {
    const parts = key.split('/');

    if (parts.length < 2) {
      return null;
    }

    const prefix = parts[0] as R2PathPrefix;

    if (prefix === 'temp') {
      const filename = parts[1];
      const fileId = filename.replace(/\.[^.]+$/, '');
      return { prefix, fileId };
    }

    if (parts.length < 3) {
      return null;
    }

    const userId = parts[1];
    const filename = parts[2];
    const fileId = filename.replace(/\.[^.]+$/, '');

    return { prefix, userId, fileId };
  }

  /**
   * Verify that a user owns a file based on the key path
   */
  verifyOwnership(key: string, userId: string): boolean {
    const parsed = this.parseKey(key);
    if (!parsed || !parsed.userId) {
      return false;
    }
    return parsed.userId === userId;
  }

  /**
   * Get public URL for a file (if public bucket is configured)
   */
  getPublicUrl(key: string): string | null {
    if (!this.publicUrl) {
      return null;
    }
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete audio file for a transcription
   */
  async deleteAudio(
    userId: string,
    transcriptionId: string,
    format: 'webm' | 'mp3' | 'wav' = 'webm',
  ): Promise<void> {
    const key = this.generateKey('audio', userId, transcriptionId, format);
    await this.deleteFile(key);
  }

  /**
   * Delete MP3 file for a PDF conversion
   */
  async deleteMp3(userId: string, pdfConversionId: string): Promise<void> {
    const key = this.generateKey('mp3', userId, pdfConversionId, 'mp3');
    await this.deleteFile(key);
  }

  /**
   * Get presigned URL for transcription audio playback/download
   */
  async getAudioUrl(
    userId: string,
    transcriptionId: string,
    format: 'webm' | 'mp3' | 'wav' = 'webm',
  ): Promise<R2PresignedUrlResult> {
    const key = this.generateKey('audio', userId, transcriptionId, format);
    return this.getPresignedDownloadUrl(key);
  }

  /**
   * Get presigned URL for PDF conversion MP3 playback/download
   */
  async getMp3Url(
    userId: string,
    pdfConversionId: string,
  ): Promise<R2PresignedUrlResult> {
    const key = this.generateKey('mp3', userId, pdfConversionId, 'mp3');
    return this.getPresignedDownloadUrl(key);
  }
}
