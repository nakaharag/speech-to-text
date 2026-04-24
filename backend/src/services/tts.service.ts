import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TtsOptions {
  voice?: TtsVoice;
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // 0.25 to 4.0
}

export interface TtsResult {
  audio: Buffer;
  duration: number; // estimated duration in seconds
  chunks: number;
}

@Injectable()
export class TtsService {
  private openaiApiKey: string;
  private readonly MAX_CHUNK_SIZE = 4000; // OpenAI TTS limit is 4096

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  async convertTextToSpeech(text: string, options: TtsOptions = {}): Promise<TtsResult> {
    const chunks = this.splitIntoChunks(text);
    const speed = options.speed || 1.0;

    console.log(`TTS: Converting ${text.length} chars in ${chunks.length} chunks`);

    if (chunks.length === 1) {
      const audio = await this.convertChunk(chunks[0], options);
      return {
        audio,
        duration: this.estimateDuration(text, speed),
        chunks: 1,
      };
    }

    // Process chunks sequentially to maintain order
    const audioChunks: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`TTS: Processing chunk ${i + 1}/${chunks.length}`);
      const audio = await this.convertChunk(chunks[i], options);
      audioChunks.push(audio);
    }

    const concatenatedAudio = await this.concatenateAudio(audioChunks);

    return {
      audio: concatenatedAudio,
      duration: this.estimateDuration(text, speed),
      chunks: chunks.length,
    };
  }

  private async convertChunk(text: string, options: TtsOptions): Promise<Buffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'tts-1',
        input: text,
        voice: options.voice || 'alloy',
        speed: options.speed || 1.0,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', response.status, errorText);
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }
      if (response.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      throw new Error(`TTS API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private splitIntoChunks(text: string): string[] {
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    // Split by sentences (period, exclamation, question mark followed by space or end)
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        // If single sentence is too long, split by words
        if (sentence.length > this.MAX_CHUNK_SIZE) {
          const words = sentence.split(/\s+/);
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length > this.MAX_CHUNK_SIZE) {
              if (wordChunk) chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              wordChunk += ' ' + word;
            }
          }
          currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async concatenateAudio(chunks: Buffer[]): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    // Write chunks to temp files
    const tempFiles = chunks.map((chunk, i) => {
      const filePath = path.join(tempDir, `tts-chunk-${timestamp}-${randomId}-${i}.mp3`);
      fs.writeFileSync(filePath, chunk);
      return filePath;
    });

    // Create concat list file for ffmpeg
    const listPath = path.join(tempDir, `tts-concat-${timestamp}-${randomId}.txt`);
    const listContent = tempFiles.map((f) => `file '${f}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const outputPath = path.join(tempDir, `tts-output-${timestamp}-${randomId}.mp3`);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', () => {
          try {
            const result = fs.readFileSync(outputPath);
            // Cleanup temp files
            this.cleanupFiles([...tempFiles, listPath, outputPath]);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          // Cleanup on error
          this.cleanupFiles([...tempFiles, listPath, outputPath]);
          reject(err);
        })
        .run();
    });
  }

  private cleanupFiles(files: string[]): void {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  estimateDuration(text: string, speed: number = 1): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length;
    const minutes = words / (150 * speed);
    return Math.ceil(minutes * 60); // Return seconds
  }

  getAvailableVoices(): { id: TtsVoice; name: string; description: string }[] {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
      { id: 'echo', name: 'Echo', description: 'Warm male voice' },
      { id: 'fable', name: 'Fable', description: 'Expressive storyteller' },
      { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', description: 'Friendly female voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
    ];
  }
}
