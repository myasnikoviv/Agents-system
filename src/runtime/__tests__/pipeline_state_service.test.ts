import { describe, expect, it } from '@jest/globals';
import {
  readPipelineStateCard,
  upsertPipelineStateCard,
  validateResumeConsistency,
} from '../PipelineStateService';

describe('PipelineStateService git context continuity', () => {
  it('persists git context fields in pipeline state card', async () => {
    const ticket = `TEST-STATE-${Date.now()}`;
    const threadId = `thread-${Date.now()}`;

    await upsertPipelineStateCard({
      pipeline: 'feature-change',
      mode: 'linear',
      stage: 'approval_gate',
      completedStages: ['intake'],
      nextStage: 'research',
      currentOwner: 'PM',
      nextOwner: 'Research',
      ticket,
      threadId,
      blockingGates: 'approval_required',
      evidenceLinks: 'run-1',
      activeBranch: 'codex/AGSYS-83',
      worktreePath: '/tmp/wt-83',
      preflightToken: '/tmp/preflights/TRADE-83.env',
    });

    const card = await readPipelineStateCard(ticket, threadId);
    expect(card).not.toBeNull();
    expect(card?.activeBranch).toBe('codex/AGSYS-83');
    expect(card?.worktreePath).toBe('/tmp/wt-83');
    expect(card?.preflightToken).toBe('/tmp/preflights/TRADE-83.env');
  });

  it('blocks resume when git context mismatches saved state', async () => {
    const ticket = `TEST-STATE-${Date.now()}-2`;
    const threadId = `thread-${Date.now()}-2`;

    await upsertPipelineStateCard({
      pipeline: 'feature-change',
      mode: 'linear',
      stage: 'approval_gate',
      completedStages: ['intake'],
      nextStage: 'research',
      currentOwner: 'PM',
      nextOwner: 'Research',
      ticket,
      threadId,
      blockingGates: 'approval_required',
      evidenceLinks: 'run-2',
      activeBranch: 'codex/AGSYS-83',
      worktreePath: '/tmp/wt-83',
      preflightToken: '/tmp/preflights/TRADE-83.env',
    });

    const result = await validateResumeConsistency({
      ticket,
      threadId,
      expectedBranch: 'codex/OTHER',
      expectedWorktreePath: '/tmp/wt-83',
      expectedPreflightToken: '/tmp/preflights/TRADE-83.env',
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toContain('state_mismatch:card_branch');
    }
  });

  it('blocks resume when editor source mismatches saved state', async () => {
    const ticket = `TEST-STATE-${Date.now()}-3`;
    const threadId = `thread-${Date.now()}-3`;

    await upsertPipelineStateCard({
      pipeline: 'feature-change',
      mode: 'linear',
      stage: 'approval_gate',
      completedStages: ['intake'],
      nextStage: 'research',
      currentOwner: 'PM',
      nextOwner: 'Research',
      ticket,
      threadId,
      blockingGates: 'approval_required',
      evidenceLinks: 'run-3',
      activeBranch: 'codex/AGSYS-83',
      worktreePath: '/tmp/wt-83',
      preflightToken: '/tmp/preflights/TRADE-83.env',
      editorSource: 'codex',
    });

    const result = await validateResumeConsistency({
      ticket,
      threadId,
      expectedEditorSource: 'claude',
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toContain('state_mismatch:card_editor');
    }
  });
});
