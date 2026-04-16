import fs from 'fs';
import path from 'path';

export type RetryErrorClass =
  | 'transient'
  | 'rate_limited'
  | 'timeout'
  | 'quota'
  | 'auth'
  | 'validation'
  | 'unknown';

interface SmartRetryPolicyConfig {
  enabled?: boolean;
  maxExpensiveRetryTokens?: number;
  retryableClasses?: RetryErrorClass[];
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function loadPolicy(workspacePath: string): SmartRetryPolicyConfig {
  return readJson<SmartRetryPolicyConfig>(
    path.resolve(workspacePath, 'docs/runtime/adaptive/smart-retry-policy.json'),
    {
      enabled: true,
      maxExpensiveRetryTokens: 4000,
      retryableClasses: ['transient', 'rate_limited', 'timeout'],
    },
  );
}

export function classifyRetryError(errorText: string): RetryErrorClass {
  const text = String(errorText || '').toLowerCase();
  if (!text.trim()) return 'unknown';
  if (text.includes('rate limit') || text.includes('429') || text.includes('too many requests')) return 'rate_limited';
  if (text.includes('timeout') || text.includes('timed out')) return 'timeout';
  if (text.includes('quota') || text.includes('insufficient_quota') || text.includes('billing')) return 'quota';
  if (text.includes('auth') || text.includes('api key') || text.includes('unauthorized') || text.includes('forbidden')) return 'auth';
  if (text.includes('invalid') || text.includes('validation') || text.includes('malformed') || text.includes('schema')) return 'validation';
  if (
    text.includes('temporar') ||
    text.includes('connection reset') ||
    text.includes('service unavailable') ||
    text.includes('network')
  ) {
    return 'transient';
  }
  return 'unknown';
}

export function shouldSmartRetry(input: {
  workspacePath: string;
  errorText: string;
  estimatedTokens: number;
}): { retry: boolean; errorClass: RetryErrorClass; reason: string } {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return { retry: true, errorClass: classifyRetryError(input.errorText), reason: 'smart_retry_disabled' };
  const errorClass = classifyRetryError(input.errorText);
  const retryable = new Set((policy.retryableClasses || []).map((x) => String(x || '').trim() as RetryErrorClass));
  if (!retryable.has(errorClass)) {
    return { retry: false, errorClass, reason: `non_retryable_error_class:${errorClass}` };
  }
  const maxExpensiveRetryTokens = Math.max(1, Number(policy.maxExpensiveRetryTokens || 4000));
  if (Number(input.estimatedTokens || 0) > maxExpensiveRetryTokens) {
    return { retry: false, errorClass, reason: `retry_too_expensive:${input.estimatedTokens}>${maxExpensiveRetryTokens}` };
  }
  return { retry: true, errorClass, reason: `retry_allowed:${errorClass}` };
}
