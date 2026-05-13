import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { R2Service } from './r2.service';

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 language code (e.g., 'en', 'pt', 'es')
  userId?: string; // User ID for R2 storage
  transcriptionId?: string; // Transcription ID for R2 storage
  saveToR2?: boolean; // Whether to save audio to R2
}

export interface TranscriptionResult {
  text: string;
  language: string | null;
  duration?: number;
  audioKey?: string; // R2 storage key if audio was saved
}

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private openaiApiKey: string;
  private r2Service: R2Service | null = null;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Set the R2 service for audio storage
   * Called by the controller to inject the R2 service
   */
  setR2Service(r2Service: R2Service): void {
    this.r2Service = r2Service;
  }

  async transcribeAudio(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const audioStream = new Readable();
    audioStream.push(audioBuffer);
    audioStream.push(null);

    let convertedAudioBuffer: Buffer;
    try {
      convertedAudioBuffer = await this.convertAudioToMp3(audioStream);
    } catch (err) {
      console.error('FFmpeg conversion error:', err);
      throw new Error('Error converting audio: ' + (err as Error).message);
    }

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio-${Date.now()}.mp3`);

    try {
      fs.writeFileSync(tempFile, convertedAudioBuffer);
      console.log(`Audio file saved: ${tempFile}, size: ${convertedAudioBuffer.length} bytes`);

      const formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(convertedAudioBuffer)], { type: 'audio/mpeg' });
      formData.append('file', fileBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');

      // Add language if specified (improves accuracy)
      if (options?.language) {
        formData.append('language', options.language);
        console.log(`Using specified language: ${options.language}`);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key.');
        }
        if (response.status === 429) {
          throw new Error('OpenAI credits exhausted. Add credits at platform.openai.com');
        }
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      const transcription = data.text;

      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Empty transcription. Try speaking louder or closer to the microphone.');
      }

      this.logger.log('Transcription successful: ' + transcription.substring(0, 100) + '...');

      // Optionally save audio to R2
      let audioKey: string | undefined;
      if (options?.saveToR2 && options?.userId && options?.transcriptionId && this.r2Service?.isAvailable()) {
        try {
          const uploadResult = await this.r2Service.uploadAudio(
            options.userId,
            options.transcriptionId,
            audioBuffer,
            'webm',
          );
          audioKey = uploadResult.key;
          this.logger.log(`Saved audio to R2: ${audioKey}`);
        } catch (r2Error) {
          // Log but don't fail the transcription if R2 upload fails
          this.logger.error('Failed to save audio to R2:', (r2Error as Error).message);
        }
      }

      return {
        text: transcription.trim(),
        language: options?.language || null,
        audioKey,
      };

    } catch (err) {
      console.error('Transcription error:', err);
      const error = err as Error & { cause?: Error };
      if (error.cause?.message?.includes('ECONNRESET') || error.message?.includes('fetch')) {
        throw new Error('Connection error with OpenAI. Please try again.');
      }
      throw error;
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async transcribeFromFile(filePath: string, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const audioBuffer = fs.readFileSync(filePath);
    return this.transcribeAudio(audioBuffer, options);
  }

  private convertAudioToMp3(audioStream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const command = ffmpeg(audioStream)
        .format('mp3')
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate('64k')
        .on('error', (err) => reject(err));

      const ffmpegStream = command.pipe();

      ffmpegStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpegStream.on('end', () => resolve(Buffer.concat(chunks)));
      ffmpegStream.on('error', (err) => reject(err));
    });
  }
}
