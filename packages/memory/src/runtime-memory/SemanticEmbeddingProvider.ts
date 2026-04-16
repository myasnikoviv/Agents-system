import OpenAI from 'openai';

export interface SemanticEmbeddingProvider {
  readonly providerId: string;
  readonly dimensions?: number;
  embed(text: string): Promise<number[]>;
}

class OpenAIEmbeddingProvider implements SemanticEmbeddingProvider {
  readonly providerId = 'openai';
  readonly dimensions?: number;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const input = String(text || '').trim();
    if (!input) return [];
    const response = await this.client.embeddings.create({
      model: this.model,
      input,
    });
    const vector = response.data?.[0]?.embedding || [];
    return Array.isArray(vector) ? vector.map((v) => Number(v)) : [];
  }
}

export function resolveSemanticEmbeddingProvider(): SemanticEmbeddingProvider {
  const openaiApiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (openaiApiKey) {
    return new OpenAIEmbeddingProvider(openaiApiKey);
  }
  throw new Error(
    'No semantic embedding provider configured. Set OPENAI_API_KEY (and optional OPENAI_EMBEDDING_MODEL).',
  );
}

