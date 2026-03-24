import { describe, it, expect } from '@jest/globals';
import { classifyOpenAIError, runOpenAIProbe } from '../OpenAIDiagnostics';

describe('OpenAIDiagnostics', () => {
  it('classifies insufficient_quota', () => {
    const e: any = { code: 'insufficient_quota', message: 'quota exceeded' };
    expect(classifyOpenAIError(e)).toBe('insufficient_quota');
  });

  it('classifies auth issues', () => {
    const e: any = { message: 'Missing credentials. Please pass an apiKey' };
    expect(classifyOpenAIError(e)).toBe('auth');
  });

  it('classifies rate limits', () => {
    const e: any = { type: 'rate_limit_error', message: 'Too many requests' };
    expect(classifyOpenAIError(e)).toBe('rate_limit');
  });

  it('returns ok=true on successful probe', async () => {
    const client: any = {
      responses: {
        create: async () => ({ id: 'resp_123' }),
      },
    };

    const result = await runOpenAIProbe(client);
    expect(result.ok).toBe(true);
    expect(result.model).toBeDefined();
  });

  it('returns classified error on failed probe', async () => {
    const client: any = {
      responses: {
        create: async () => {
          const err: any = new Error('429 You exceeded your current quota');
          err.code = 'insufficient_quota';
          throw err;
        },
      },
    };

    const result = await runOpenAIProbe(client);
    expect(result.ok).toBe(false);
    expect(result.category).toBe('insufficient_quota');
  });
});
