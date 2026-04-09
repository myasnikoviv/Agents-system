import fs from 'fs';
import os from 'os';
import path from 'path';
jest.mock('../governance/GovernanceLogger', () => ({
  logGovernance: () => undefined,
}));
import { executeViaWorkbench } from '../WorkbenchGateway';
import {
  resetWorkbenchToolRegistry,
  resolveWorkbenchToolPolicy,
  upsertWorkbenchToolPolicy,
} from '../WorkbenchToolRegistry';
import { resetWorkbenchState } from '../AgentWorkbenchScheduler';

function makeContext(agentSlug: string, workspacePath: string): any {
  return {
    runId: `run-${Date.now()}-${agentSlug}`,
    threadId: 'thread-test',
    chainId: 'thread-scope-1',
    projectId: 'agent_system',
    tenantId: 'tenant-a',
    workspaceId: 'workspace-a',
    workspacePath,
    provider: 'openai',
    model: 'gpt-4o-mini',
    executionTarget: 'langchain',
    task: { rawUserInput: 'test', normalizedGoal: 'test', taskType: 'test' },
    pipeline: { id: 'test', title: 'test', currentStageId: 'stage', currentStageTitle: 'stage', stepIndex: 0, allowedNextStages: [] },
    agent: { slug: agentSlug, title: agentSlug, mission: 'test', instructions: '', skills: [] },
    artifacts: { priorOutputs: [] },
    memory: { threadHistory: [], sharedFacts: {}, runDecisions: {} },
    tools: [],
    outputContract: { responseMode: 'final', requiredSections: [], mustWriteArtifactLog: true, mustEmitEvent: true },
    guardrails: { allowedActions: [], blockedActions: [] },
    activeTicketId: 'AGSYS-2913',
    startTime: new Date().toISOString(),
  };
}

describe('Workbench scope model and access enforcement', () => {
  beforeEach(() => {
    resetWorkbenchToolRegistry();
    resetWorkbenchState();
  });

  it('resolves workspace policy over global policy', () => {
    upsertWorkbenchToolPolicy({
      id: 'read_file',
      type: 'parallel',
      allowedAgents: ['*'],
      risk: 'safe',
      scope: { level: 'global' },
    });
    upsertWorkbenchToolPolicy({
      id: 'read_file',
      type: 'exclusive',
      allowedAgents: ['*'],
      risk: 'mutable',
      scope: { level: 'workspace', tenantId: 'tenant-a', workspaceId: 'workspace-a' },
    });
    const resolved = resolveWorkbenchToolPolicy('read_file', {
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      sessionId: 'thread-scope-1',
    });
    expect(resolved?.type).toBe('exclusive');
    expect(resolved?.scope?.level).toBe('workspace');
  });

  it('blocks unsafe tool when policy is not isolated', async () => {
    upsertWorkbenchToolPolicy({
      id: 'read_file',
      type: 'parallel',
      allowedAgents: ['*'],
      risk: 'unsafe',
      scope: { level: 'workspace', tenantId: 'tenant-a', workspaceId: 'workspace-a' },
    });

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-scope-'));
    const file = path.join(tmp, 'note.txt');
    fs.writeFileSync(file, 'hello', 'utf-8');
    const result = await executeViaWorkbench('read_file', { path: file }, makeContext('agent-a', tmp));
    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('unsafe tool must be isolated');
  });
});
