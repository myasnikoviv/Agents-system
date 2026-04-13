import fs from 'fs';
import os from 'os';
import path from 'path';
import { classifyRetryError, shouldSmartRetry } from '../optimization/SmartRetryPolicy';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'smart-retry-'));
}

describe('SmartRetryPolicy', () => {
  it('classifies errors and retries selectively', () => {
    expect(classifyRetryError('HTTP 429 too many requests')).toBe('rate_limited');
    expect(classifyRetryError('request timeout reached')).toBe('timeout');
    expect(classifyRetryError('invalid request schema')).toBe('validation');
    expect(classifyRetryError('authentication failed: api key')).toBe('auth');
  });

  it('blocks retry for non-retryable and expensive cases', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/smart-retry-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(
      policyPath,
      JSON.stringify(
        {
          enabled: true,
          maxExpensiveRetryTokens: 100,
          retryableClasses: ['transient', 'rate_limited', 'timeout'],
        },
        null,
        2,
      ),
      'utf-8',
    );

    const nonRetryable = shouldSmartRetry({
      workspacePath: workspace,
      errorText: 'invalid request schema',
      estimatedTokens: 10,
    });
    expect(nonRetryable.retry).toBe(false);

    const expensive = shouldSmartRetry({
      workspacePath: workspace,
      errorText: 'HTTP 429 too many requests',
      estimatedTokens: 500,
    });
    expect(expensive.retry).toBe(false);

    const allowed = shouldSmartRetry({
      workspacePath: workspace,
      errorText: 'HTTP 429 too many requests',
      estimatedTokens: 10,
    });
    expect(allowed.retry).toBe(true);
  });
});
