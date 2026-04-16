import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildSemanticCacheBucket,
  getSemanticCacheHit,
  setSemanticCacheEntry,
} from '../optimization/SemanticCache';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-cache-'));
}

describe('SemanticCache (MVP)', () => {
  it('reuses output for similar inputs with configurable threshold', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/semantic-cache-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(
      policyPath,
      JSON.stringify(
        {
          enabled: true,
          threshold: 0.5,
          ttlSeconds: 600,
          maxEntriesPerBucket: 20,
        },
        null,
        2,
      ),
      'utf-8',
    );

    const bucket = buildSemanticCacheBucket({
      pipelineId: 'new-feature',
      agentSlug: 'developer',
      stage: { id: '1', title: 'Implement fix' },
    });
    setSemanticCacheEntry({
      workspacePath: workspace,
      bucket,
      prompt: 'fix timeout in backend api',
      response: 'patched timeout handling',
      nowMs: 1000,
    });

    const hit = getSemanticCacheHit({
      workspacePath: workspace,
      bucket,
      query: 'please fix timeout in api backend',
      nowMs: 1200,
    });
    expect(hit.hit).toBe(true);
    expect(hit.response).toContain('patched');
    expect(Number(hit.score || 0)).toBeGreaterThanOrEqual(0.5);
  });

  it('misses when similarity is below threshold', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/semantic-cache-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(policyPath, JSON.stringify({ threshold: 0.95 }, null, 2), 'utf-8');

    const bucket = buildSemanticCacheBucket({
      pipelineId: 'new-feature',
      agentSlug: 'developer',
      stage: { id: '1', title: 'Implement fix' },
    });
    setSemanticCacheEntry({
      workspacePath: workspace,
      bucket,
      prompt: 'fix timeout in backend api',
      response: 'patched timeout handling',
      nowMs: 1000,
    });

    const miss = getSemanticCacheHit({
      workspacePath: workspace,
      bucket,
      query: 'design dashboard ui and fonts',
      nowMs: 1200,
    });
    expect(miss.hit).toBe(false);
  });
});
