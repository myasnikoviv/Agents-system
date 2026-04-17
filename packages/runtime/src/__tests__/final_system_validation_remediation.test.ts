import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { describe, expect, it } from '@jest/globals';
import { getGitExecutionContext, validatePreflightTokenPolicy } from '../GitExecutionGuard';
import { BlackboardService } from '../BlackboardService';
import { acquireToolLease, releaseToolLease, resetWorkbenchState } from '../AgentWorkbenchScheduler';

function writeApprovedToken(preflightDir: string, context: { branch: string; worktreePath: string }) {
  fs.mkdirSync(preflightDir, { recursive: true });
  const tokenPath = path.join(preflightDir, 'S16-2.env');
  fs.writeFileSync(
    tokenPath,
    [
      `BRANCH=${context.branch}`,
      `WORKTREE=${context.worktreePath}`,
      'STATUS=APPROVED',
      'EXECUTION_APPROVED=YES',
      'APPROVED_BY=PM',
      `APPROVED_AT=${new Date().toISOString()}`,
    ].join('\n'),
    'utf-8',
  );
}

describe('Final Validation Remediation Scenarios', () => {
  it('Scenario #1: full happy path has tools, artifacts, governance outputs', () => {
    const output = execSync('npm run verify', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    expect(output).toContain('FINAL AGENTIC RUNTIME PROOF');
    expect(output).toContain('tool_call_raw');
    expect(output).toContain('FINAL RESPONSE FROM RUNTIME');
    expect(output).toContain('Saved artifacts:');
  });

  it('Scenario #2: preflight block -> remediation token -> retry pass', () => {
    const context = getGitExecutionContext(process.cwd());
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's16-preflight-'));
    const first = validatePreflightTokenPolicy({
      context,
      hasMutatingAction: true,
      preflightDir: tmpDir,
    });
    expect(first.ok).toBe(false);
    expect(String(first.reason || '')).toContain('preflight_missing');

    writeApprovedToken(tmpDir, context);
    const second = validatePreflightTokenPolicy({
      context,
      hasMutatingAction: true,
      preflightDir: tmpDir,
    });
    expect(second.ok).toBe(true);
  });

  it('Scenario #5: parallel multi-agent execution semantics (no race)', async () => {
    resetWorkbenchState();
    const [a, b] = await Promise.all([
      Promise.resolve(acquireToolLease('figma', 'agent-A')),
      Promise.resolve(acquireToolLease('figma', 'agent-B')),
    ]);
    expect([a.status, b.status].sort()).toEqual(['acquired', 'queued']);
    const released = releaseToolLease('figma', a.status === 'acquired' ? 'agent-A' : 'agent-B');
    expect(released.released).toBe(true);
    expect(Boolean(released.nextOwner)).toBe(true);
  });

  it('Scenario #7: memory is isolated between two project namespaces', async () => {
    const run = `s16-7-${Date.now()}`;
    const ctxA = { projectId: 'proj-A', chainId: 'chain-A', runId: run };
    const ctxB = { projectId: 'proj-B', chainId: 'chain-B', runId: run };

    await BlackboardService.publishFact(ctxA, 'isolation_key', { owner: 'A' }, 'run');
    await BlackboardService.publishFact(ctxB, 'isolation_key', { owner: 'B' }, 'run');

    const contextA: any = {
      projectId: 'proj-A',
      chainId: 'chain-A',
      runId: run,
      artifacts: { priorOutputs: [] },
      memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] },
    };
    const contextB: any = {
      projectId: 'proj-B',
      chainId: 'chain-B',
      runId: run,
      artifacts: { priorOutputs: [] },
      memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] },
    };

    await BlackboardService.hydrate(contextA);
    await BlackboardService.hydrate(contextB);

    expect(contextA.memory.sharedFacts.isolation_key.owner).toBe('A');
    expect(contextB.memory.sharedFacts.isolation_key.owner).toBe('B');
  });
});
