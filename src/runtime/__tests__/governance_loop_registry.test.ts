import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createGovernanceLoop,
  disableGovernanceLoop,
  getGovernanceLoopById,
  isGovernanceLoopRunnable,
  loadGovernanceLoops,
  updateGovernanceLoop,
} from '../governance/LoopRegistry';

function mkWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-loop-'));
  fs.mkdirSync(path.join(root, 'docs/runtime/governance'), { recursive: true });
  return root;
}

describe('LoopRegistry lifecycle', () => {
  it('creates, updates and disables loop entities', () => {
    const workspace = mkWorkspace();
    const created = createGovernanceLoop(
      {
        id: 'improvement_default',
        kind: 'improvement',
        enabledByDefault: true,
        scope: { level: 'project', projectId: 'agent_system' },
      },
      workspace,
    );
    expect(created.id).toBe('improvement_default');

    const updated = updateGovernanceLoop(
      'improvement_default',
      {
        config: { maxRetries: 3 },
        metadata: { description: 'Project improvement loop' },
      },
      workspace,
    );
    expect(updated.config?.maxRetries).toBe(3);

    const disabled = disableGovernanceLoop('improvement_default', { disabled: true }, workspace);
    expect(disabled.disabled).toBe(true);

    const byId = getGovernanceLoopById('improvement_default', workspace);
    expect(byId?.disabled).toBe(true);

    const list = loadGovernanceLoops(workspace);
    expect(list).toHaveLength(1);
  });

  it('resolves loop runnable state by scope', () => {
    const loop = {
      id: 'validation_session',
      kind: 'validation' as const,
      enabledByDefault: true,
      scope: { level: 'session' as const, projectId: 'p1', sessionId: 'thread-1' },
    };
    expect(isGovernanceLoopRunnable(loop, { projectId: 'p1', chainId: 'thread-1' })).toBe(true);
    expect(isGovernanceLoopRunnable(loop, { projectId: 'p2', chainId: 'thread-1' })).toBe(false);
    expect(isGovernanceLoopRunnable(loop, { projectId: 'p1', chainId: 'thread-2' })).toBe(false);
  });
});
