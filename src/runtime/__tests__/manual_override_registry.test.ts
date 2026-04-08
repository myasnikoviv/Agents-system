import fs from 'fs';
import os from 'os';
import path from 'path';
import { addManualOverride, listManualOverrides, resolveManualOverride } from '../governance/ManualOverrideRegistry';
import type { GovernanceEngineContext } from '../governance/GovernanceEngineTypes';

describe('ManualOverrideRegistry', () => {
  let tmpDir: string;
  const oldCwd = process.cwd();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agsys-override-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(oldCwd);
  });

  it('stores and resolves rule-level overrides', () => {
    addManualOverride({
      projectId: 'proj-a',
      scope: 'rule',
      ruleId: 'git_preflight',
      actorId: 'tester',
      reason: 'temporary unblock',
      ticketId: 'AGSYS-537',
    });
    const rows = listManualOverrides();
    expect(rows.length).toBe(1);
    const ctx: GovernanceEngineContext = {
      runId: 'r1',
      projectId: 'proj-a',
      ticketId: 'AGSYS-537',
      chainId: 'c1',
      workspacePath: tmpDir,
    };
    const hit = resolveManualOverride({
      context: ctx,
      phase: 'BEFORE_RUN',
      ruleId: 'git_preflight',
    });
    expect(hit?.scope).toBe('rule');
    expect(hit?.ruleId).toBe('git_preflight');
  });
});

