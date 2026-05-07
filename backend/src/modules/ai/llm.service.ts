import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow<string>('LLM_API_KEY'),
    });
    this.model = this.config.get<string>('LLM_MODEL') ?? 'claude-sonnet-4-6';
    this.timeoutMs = this.config.get<number>('LLM_TIMEOUT_MS') ?? 60000;
  }

  async call(prompt: string, temperature = 0.3): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 4096,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal },
      );

      const block = response.content[0];
      if (block.type !== 'text') throw new Error('Unexpected response type from LLM');
      return block.text;
    } finally {
      clearTimeout(timer);
    }
  }

  parseJSON(raw: string): unknown {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  }
}
