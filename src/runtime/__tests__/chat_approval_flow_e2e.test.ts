import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { Server } from 'http';
import { closeRedisClient } from '../redisClient';
import { upsertPipelineStateCard } from '../PipelineStateService';

jest.mock('../AgentExecutor', () => {
  return {
    AgentExecutor: class {
      async runRole(roleSlug: string) {
        return `[mock:${roleSlug}] ok`;
      }
    }
  };
});

let app: any;
let server: Server;
let baseUrl = '';

beforeAll(async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.PILOT_DELEGATED_ROLES = 'research';
  process.env.PILOT_APPROVAL_POLICY_MODE = 'git-only';
  const mod = await import('../../server');
  app = mod.default;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${addr.port}`;
}, 15000);

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await closeRedisClient();
});

describe('Chat approve flow e2e', () => {
  const validIntakeMessage =
    'Please implement a stable pipeline governance feature for the cockpit with acceptance criteria, verification steps, and git preflight enforcement.';

  it('completes send -> interrupt -> approve chain to done', async () => {
    const startRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
    });
    expect(startRes.status).toBe(200);
    const startData: any = await startRes.json();

    expect(startData.success).toBe(true);
    expect(startData.status).toBe('awaiting_approval');
    expect(typeof startData.threadId).toBe('string');
    expect(typeof startData.ticketId).toBe('string');
    expect(typeof startData.selectedPipeline).toBe('string');
    expect(['unified-task-intake', 'feature-change']).toContain(startData.selectedPipeline);
    expect(typeof startData.pipelineConfidence).toBe('string');

    const approve1 = await fetch(`${baseUrl}/api/chat/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
    });
    expect(approve1.status).toBe(200);
    const data1: any = await approve1.json();
    expect(data1.success).toBe(true);
    expect(data1.status).toBe('docs_completed');
    expect(Array.isArray(data1.logs)).toBe(true);
    expect(data1.logs.length).toBeGreaterThan(0);
  }, 30000);

  it('blocks approve when pipeline state next stage mismatches runtime state', async () => {
    const startRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
    });
    expect(startRes.status).toBe(200);
    const startData: any = await startRes.json();
    expect(startData.success).toBe(true);
    expect(startData.status).toBe('awaiting_approval');

    await upsertPipelineStateCard({
      pipeline: startData.selectedPipeline,
      mode: 'linear',
      stage: 'approval_gate',
      completedStages: ['intake'],
      nextStage: 'git',
      currentOwner: 'Сокіл-Координатор (PM Orchestrator)',
      nextOwner: 'Pending Approval',
      ticket: startData.ticketId,
      threadId: startData.threadId,
      blockingGates: 'approval_required',
      evidenceLinks: startData.runId,
      activeBranch: 'codex/AGSYS-78-main-recovery',
      worktreePath: '/Users/myasnikoviv/development/agent-system-worktrees/AGSYS-78',
      preflightToken:
        '/Users/myasnikoviv/development/agent-system-worktrees/AGSYS-78/docs/process/git/preflights/AGSYS-78.env',
    });

    const approve = await fetch(`${baseUrl}/api/chat/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
    });
    expect(approve.status).toBe(409);
    const data: any = await approve.json();
    expect(data.success).toBe(false);
    expect(data.status).toBe('blocked');
    expect(String(data.error || '')).toContain('state_mismatch');
  });

  it('blocks approve when branch/worktree context mismatches saved state card', async () => {
    const startRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
    });
    expect(startRes.status).toBe(200);
    const startData: any = await startRes.json();
    expect(startData.success).toBe(true);
    expect(startData.status).toBe('awaiting_approval');

    await upsertPipelineStateCard({
      pipeline: startData.selectedPipeline,
      mode: 'linear',
      stage: 'approval_gate',
      completedStages: ['intake'],
      nextStage: 'git',
      currentOwner: 'Сокіл-Координатор (PM Orchestrator)',
      nextOwner: 'Pending Approval',
      ticket: startData.ticketId,
      threadId: startData.threadId,
      blockingGates: 'approval_required',
      evidenceLinks: startData.runId,
      activeBranch: 'codex/some-other-branch',
      worktreePath: '/tmp/other-worktree',
      preflightToken: '/tmp/non-existent.env',
    });

    const approve = await fetch(`${baseUrl}/api/chat/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
    });
    expect(approve.status).toBe(409);
    const data: any = await approve.json();
    expect(data.success).toBe(false);
    expect(data.status).toBe('blocked');
    expect(String(data.error || '')).toContain('state_mismatch:card_branch');
  });
});
