import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildToolCacheKey,
  getToolResultFromCache,
  isDeterministicToolCacheable,
  setToolResultToCache,
} from '../optimization/ToolResultCache';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tool-cache-'));
}

describe('ToolResultCache', () => {
  it('caches deterministic tool results and reuses them', () => {
    const workspace = mkTmpWorkspace();
    const key = buildToolCacheKey({
      toolId: 'read_file',
      args: { path: 'README.md' },
      scopeLevel: 'workspace',
      tenantId: 't1',
      workspaceId: 'w1',
    });
    setToolResultToCache({
      workspacePath: workspace,
      key,
      content: 'hello',
      nowMs: 1000,
    });
    const hit = getToolResultFromCache({
      workspacePath: workspace,
      key,
      nowMs: 1200,
    });
    expect(hit.hit).toBe(true);
    expect(hit.content).toBe('hello');
  });

  it('honors cacheability constraints (safe + allowlist)', () => {
    const workspace = mkTmpWorkspace();
    expect(
      isDeterministicToolCacheable({
        workspacePath: workspace,
        toolId: 'read_file',
        policy: { id: 'read_file', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
      }),
    ).toBe(true);
    expect(
      isDeterministicToolCacheable({
        workspacePath: workspace,
        toolId: 'filesystem',
        policy: { id: 'filesystem', type: 'exclusive', allowedAgents: ['*'], risk: 'mutable', scope: { level: 'workspace' } },
      }),
    ).toBe(false);
  });
});
