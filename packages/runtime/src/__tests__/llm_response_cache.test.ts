import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildLlmResponseCacheKey,
  getCachedLlmResponse,
  setCachedLlmResponse,
} from '../optimization/LlmResponseCache';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'llm-cache-'));
}

describe('LlmResponseCache', () => {
  it('supports cache hit with TTL and deterministic key', () => {
    const workspace = mkTmpWorkspace();
    const key = buildLlmResponseCacheKey({
      pipelineId: 'new-feature',
      stage: { id: '1', title: 'Implement fix' },
      agentSlug: 'developer',
      userInput: 'Fix timeout',
    });
    const key2 = buildLlmResponseCacheKey({
      pipelineId: 'new-feature',
      stage: { id: '2', title: '  implement   fix ' },
      agentSlug: 'developer',
      userInput: ' fix timeout ',
    });
    expect(key).toBe(key2);

    setCachedLlmResponse({
      workspacePath: workspace,
      key,
      value: 'cached answer',
      nowMs: 1000,
    });
    const hit = getCachedLlmResponse({
      workspacePath: workspace,
      key,
      stage: { id: '1' },
      nowMs: 1500,
    });
    expect(hit.hit).toBe(true);
    expect(hit.value).toContain('cached answer');
  });

  it('does not use cache for critical stage by default', () => {
    const workspace = mkTmpWorkspace();
    const key = buildLlmResponseCacheKey({
      pipelineId: 'new-feature',
      stage: { id: '1', title: 'Implement fix' },
      agentSlug: 'developer',
      userInput: 'Fix timeout',
    });
    setCachedLlmResponse({
      workspacePath: workspace,
      key,
      value: 'cached answer',
      nowMs: 1000,
    });
    const miss = getCachedLlmResponse({
      workspacePath: workspace,
      key,
      stage: { id: '1', critical: true },
      nowMs: 1200,
    });
    expect(miss.hit).toBe(false);
  });
});
