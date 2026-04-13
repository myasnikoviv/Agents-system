import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildStepDedupKey } from '../optimization/StepDedupEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'step-dedup-'));
}

describe('StepDedupEngine', () => {
  it('generates same key for semantically duplicate steps', () => {
    const workspace = mkTmpWorkspace();
    const key1 = buildStepDedupKey({
      workspacePath: workspace,
      pipelineId: 'new-feature',
      agentSlug: 'developer',
      userInput: 'Fix timeout in API',
      stage: { id: '7', title: 'Implement fix' },
    });
    const key2 = buildStepDedupKey({
      workspacePath: workspace,
      pipelineId: 'new-feature',
      agentSlug: 'developer',
      userInput: '  fix timeout in api  ',
      stage: { id: '8', title: 'Implement   fix' },
    });
    expect(typeof key1).toBe('string');
    expect(key1).toBe(key2);
  });

  it('can be disabled via policy', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/chain-optimization-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(policyPath, JSON.stringify({ enabled: false }, null, 2), 'utf-8');

    const key = buildStepDedupKey({
      workspacePath: workspace,
      pipelineId: 'new-feature',
      agentSlug: 'developer',
      userInput: 'fix',
      stage: { id: '1', title: 'Fix' },
    });
    expect(key).toBeNull();
  });
});
