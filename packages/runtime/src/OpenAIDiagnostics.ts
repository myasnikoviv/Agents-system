import OpenAI from 'openai';

export type OpenAIErrorCategory = 'insufficient_quota' | 'rate_limit' | 'auth' | 'network' | 'unknown';

export function classifyOpenAIError(error: any): OpenAIErrorCategory {
  const code = String(error?.code || error?.error?.code || '').toLowerCase();
  const type = String(error?.type || error?.error?.type || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const payload = `${code} ${type} ${message}`;

  if (payload.includes('insufficient_quota') || payload.includes('quota')) return 'insufficient_quota';
  if (payload.includes('rate_limit') || payload.includes('too many requests')) return 'rate_limit';
  if (
    payload.includes('auth') ||
    payload.includes('invalid_api_key') ||
    payload.includes('unauthorized') ||
    payload.includes('missing credentials')
  ) {
    return 'auth';
  }
  if (payload.includes('econnrefused') || payload.includes('enotfound') || payload.includes('network')) return 'network';
  return 'unknown';
}

export async function runOpenAIProbe(client: OpenAI): Promise<{
  ok: boolean;
  model: string;
  category?: OpenAIErrorCategory;
  message?: string;
}> {
  const model = process.env.OPENAI_DIAGNOSTIC_MODEL || 'gpt-4o-mini';
  try {
    await client.responses.create({
      model,
      input: 'healthcheck',
      max_output_tokens: 1,
    });
    return { ok: true, model };
  } catch (error: any) {
    return {
      ok: false,
      model,
      category: classifyOpenAIError(error),
      message: error?.message || 'Unknown OpenAI error',
    };
  }
}
