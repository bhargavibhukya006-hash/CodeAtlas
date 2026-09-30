import OpenAI from 'openai';
import { config } from '../config';
import { ConfigurationError, ExternalApiError } from '../utils/errors';

export class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (config.openai.apiKey) {
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  public hasApiKey(): boolean {
    return Boolean(
      config.openai.apiKey &&
      config.openai.apiKey.trim().length > 0 &&
      !config.openai.apiKey.includes('your_openai_api_key')
    );
  }

  private getClient(): OpenAI {
    if (!this.client) {
      if (this.hasApiKey()) {
        this.client = new OpenAI({ apiKey: config.openai.apiKey });
      } else {
        throw new ConfigurationError(
          'OPENAI_API_KEY is not configured in .env. Please add a valid OpenAI API key to enable live semantic embeddings and AI analysis.'
        );
      }
    }
    return this.client;
  }

  /**
   * Generates a deterministic normalized 1536-dim vector for offline demo testing
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const vec = new Array(1536).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 1536; i++) {
      vec[i] = Math.sin((hash + i) * 0.05);
    }
    return vec;
  }

  /**
   * Generates embeddings in batches for an array of text chunks
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    if (!this.hasApiKey()) {
      return texts.map((t) => this.generateDeterministicEmbedding(t));
    }

    const client = this.getClient();
    const batchSize = config.retrieval.maxEmbeddingBatchSize;
    const allEmbeddings: number[][] = [];

    // Sanitize and truncate inputs slightly if needed (8191 tokens max for text-embedding-3-small)
    const sanitizedTexts = texts.map((t) => {
      const trimmed = t.trim();
      return trimmed.length > 8000 ? trimmed.slice(0, 8000) : trimmed || 'empty';
    });

    for (let i = 0; i < sanitizedTexts.length; i += batchSize) {
      const batch = sanitizedTexts.slice(i, i + batchSize);
      try {
        const response = await client.embeddings.create({
          model: config.openai.embeddingModel,
          input: batch,
          encoding_format: 'float',
        });

        for (const item of response.data) {
          allEmbeddings.push(item.embedding);
        }
      } catch (err: any) {
        console.error('[OpenAIService] Embeddings generation failed:', err.message);
        throw new ExternalApiError('OpenAI', err.message);
      }
    }

    return allEmbeddings;
  }

  /**
   * Generates a single embedding for search query or prompt
   */
  async generateSingleEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  /**
   * Sends prompt to LLM and returns the completion
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    responseFormat: 'text' | 'json_object' = 'text'
  ): Promise<string> {
    const client = this.getClient();

    try {
      const response = await client.chat.completions.create({
        model: config.openai.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // low temperature for grounded deterministic answers
        response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new ExternalApiError('OpenAI', 'Empty response received from LLM');
      }

      return messageContent;
    } catch (err: any) {
      if (err instanceof ConfigurationError) throw err;
      console.error('[OpenAIService] Chat completion failed:', err.message);
      throw new ExternalApiError('OpenAI', err.message);
    }
  }
}

export const openaiService = new OpenAIService();
