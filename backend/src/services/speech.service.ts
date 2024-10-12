import { Injectable } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { SpeechClient } from '@google-cloud/speech';
import * as ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

@Injectable()
export class SpeechService {
  private speechClient: SpeechClient;
  private ttsClient: TextToSpeechClient;

  constructor() {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);

      this.speechClient = new SpeechClient({
        credentials: credentials,
      });

      this.ttsClient = new TextToSpeechClient({
        credentials: credentials,
      });
    } else {
      console.error(
        'Google application credentials are not set. Using default credentials.',
      );
      this.speechClient = new SpeechClient(); // Uses default credentials if no custom credentials are provided
      this.ttsClient = new TextToSpeechClient(); // Uses default credentials if no custom credentials are provided
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const audioStream = new Readable();
    audioStream.push(audioBuffer);
    audioStream.push(null);

    const convertedAudioBuffer = await this.convertAudioToLinear16(audioStream);

    const request = {
      audio: { content: convertedAudioBuffer.toString('base64') },
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: 'pt-BR',
      },
    };

    const [response] = await this.speechClient.recognize(request);

    if (!response.results || response.results.length === 0) {
      throw new Error('No transcription results found.');
    }

    const transcription = response.results
      .map((result) => result.alternatives[0]?.transcript || '')
      .filter((transcript) => transcript.trim() !== '')
      .join('\n');

    // Se a transcrição ainda estiver vazia após a filtragem
    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Transcription is empty.');
    }

    return transcription;
  }

  private convertAudioToLinear16(audioStream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const command = ffmpeg(audioStream)
        .format('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('error', (err) => reject(err));

      const ffmpegStream = command.pipe();

      ffmpegStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpegStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const request = {
      input: { text },
      voice: {
        languageCode: 'pt-BR',
        ssmlGender: 'NEUTRAL' as const,
      },
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const responses = await this.ttsClient.synthesizeSpeech(request);
    const response = responses[0];

    if (!response.audioContent) {
      throw new Error('No audio content received.');
    }

    return response.audioContent as Buffer;
  }
}
