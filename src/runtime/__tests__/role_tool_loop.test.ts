import { describe, expect, it } from '@jest/globals';
import { buildRoleExecutionEnvelope, validatePlannedToolActions } from '../RoleToolLoop';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('RoleToolLoop guards', () => {
  it('blocks unauthorized planned tool action for role', () => {
    const env = buildRoleExecutionEnvelope({
      role: 'documentation-owner',
      pipeline: 'new-feature',
      stage: 'docs',
      ticketId: 'TRADE-72',
      threadId: 'thread-1',
    });

    const result = validatePlannedToolActions(env, [
      { tool: 'git', purpose: 'commit docs changes' },
    ]);

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('unauthorized_tool:git');
  });

  it('allows authorized planned tool actions', () => {
    const env = buildRoleExecutionEnvelope({
      role: 'git-flow-manager',
      pipeline: 'git-conflict-recovery',
      stage: 'recovery',
      ticketId: 'TRADE-72',
      threadId: 'thread-2',
    });

    const result = validatePlannedToolActions(env, [
      { tool: 'git', purpose: 'resolve branch scope and finalize merge' },
      { tool: 'plane', purpose: 'update task state' },
    ]);

    expect(result.ok).toBe(true);
  });

  it('blocks mutating action on main branch', () => {
    const env = buildRoleExecutionEnvelope({
      role: 'developer',
      pipeline: 'new-feature',
      stage: 'implementation',
      ticketId: 'TRADE-79',
      threadId: 'thread-3',
    });

    const result = validatePlannedToolActions(
      env,
      [{ tool: 'filesystem', purpose: 'implement feature' }],
      { branch: 'main' },
    );

    expect(result.ok).toBe(false);
    expect(String(result.blockedReason || '')).toContain('main_branch_mutation_forbidden');
  });

  it('blocks mutating action when preflight token is missing', () => {
    const env = buildRoleExecutionEnvelope({
      role: 'developer',
      pipeline: 'new-feature',
      stage: 'implementation',
      ticketId: 'TRADE-80',
      threadId: 'thread-4',
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-missing-'));

    const result = validatePlannedToolActions(
      env,
      [{ tool: 'filesystem', purpose: 'implement feature' }],
      { branch: 'codex/TRADE-80', worktreePath: '/tmp/wt-80' },
      { preflightDir: tmpDir },
    );

    expect(result.ok).toBe(false);
    expect(String(result.blockedReason || '')).toContain('preflight_missing');
  });

  it('allows mutating action when valid preflight token exists', () => {
    const env = buildRoleExecutionEnvelope({
      role: 'developer',
      pipeline: 'new-feature',
      stage: 'implementation',
      ticketId: 'TRADE-80',
      threadId: 'thread-5',
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-valid-'));
    const tokenPath = path.join(tmpDir, 'TRADE-80.env');
    fs.writeFileSync(
      tokenPath,
      [
        'BRANCH=codex/TRADE-80',
        'WORKTREE=/tmp/wt-80',
        'STATUS=APPROVED',
        'EXECUTION_APPROVED=YES',
        'APPROVED_BY=Pan Hilka',
        'APPROVED_AT=2026-03-19T12:00:00Z',
      ].join('\n'),
      'utf-8',
    );

    const result = validatePlannedToolActions(
      env,
      [{ tool: 'filesystem', purpose: 'implement feature' }],
      { branch: 'codex/TRADE-80', worktreePath: '/tmp/wt-80' },
      { preflightDir: tmpDir },
    );

    expect(result.ok).toBe(true);
  });
});
