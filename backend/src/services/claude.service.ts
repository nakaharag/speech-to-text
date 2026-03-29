import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async correctTranscript(text: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You correct audio transcriptions. Fix spelling, punctuation, and grammar errors while maintaining the original meaning and tone. Return only the corrected text without any explanations.`,
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }

      return text;
    } catch (err) {
      console.error('Claude correctTranscript error:', err);
      return text;
    }
  }

  async generateSummary(text: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Generate a concise summary of this text in 2-3 sentences. Focus on the key points and main ideas. Return only the summary without any labels or prefixes.

Text:
${text}`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        let summary = content.text.trim();
        summary = summary.replace(/^(Summary:?\s*)/i, '');
        return summary.trim();
      }

      return '';
    } catch (err) {
      console.error('Claude generateSummary error:', err);
      return '';
    }
  }

  async processTranscript(text: string): Promise<{ correctedTranscript: string; summary: string }> {
    try {
      const [correctedTranscript, summary] = await Promise.all([
        this.correctTranscript(text),
        this.generateSummary(text),
      ]);

      return { correctedTranscript, summary };
    } catch (err) {
      console.error('Claude processTranscript error:', err);
      return { correctedTranscript: text, summary: '' };
    }
  }
}
