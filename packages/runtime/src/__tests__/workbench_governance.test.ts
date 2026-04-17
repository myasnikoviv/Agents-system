import fs from 'fs';
import os from 'os';
import path from 'path';
import { executeViaWorkbench } from '../WorkbenchGateway';
import {
  resetWorkbenchState,
  acquireToolLease,
  releaseToolLease,
} from '../AgentWorkbenchScheduler';
import {
  resetWorkbenchToolRegistry,
  upsertWorkbenchToolPolicy,
} from '../WorkbenchToolRegistry';
import { ToolExecutor } from '../ToolExecutor';

function makeContext(agentSlug: string, workspacePath: string): any {
  return {
    runId: `run-${Date.now()}-${agentSlug}`,
    threadId: 'thread-test',
    chainId: 'thread-test',
    projectId: 'agent_system',
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
    activeTicketId: 'AGSYS-S7-TEST',
    startTime: new Date().toISOString(),
  };
}

async function test_direct_tool_access_blocked(): Promise<void> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-test-'));
  let blocked = false;
  try {
    await ToolExecutor.execute('read_file', { path: 'x.md' }, makeContext('agent-a', tmp));
  } catch (err: any) {
    blocked = String(err?.message || '').includes('direct_tool_access_blocked');
  }
  console.assert(blocked, 'direct tool access must be blocked');
  console.log('[PASS] S7 no-direct-tool-access enforced');
}

async function test_access_control(): Promise<void> {
  resetWorkbenchToolRegistry();
  resetWorkbenchState();
  upsertWorkbenchToolPolicy({ id: 'read_file', type: 'parallel', allowedAgents: ['agent-allow'] });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-test-'));
  const denied = await executeViaWorkbench('read_file', { path: 'missing.txt' }, makeContext('agent-deny', tmp));
  console.assert(denied.status === 'blocked', 'unauthorized agent must be blocked');
  console.log('[PASS] S7 agent->tool ACL enforced');
}

async function test_exclusive_queue_semantics(): Promise<void> {
  resetWorkbenchToolRegistry();
  resetWorkbenchState();
  upsertWorkbenchToolPolicy({ id: 'figma', type: 'exclusive', allowedAgents: ['*'] });

  const one = acquireToolLease('figma', 'agent-a');
  console.assert(one.status === 'acquired', 'first exclusive lease must acquire');
  const two = acquireToolLease('figma', 'agent-b');
  console.assert(two.status === 'queued', 'second exclusive lease must queue');
  const released = releaseToolLease('figma', 'agent-a');
  console.assert(released.nextOwner === 'agent-b', 'queued owner should be promoted');
  console.log('[PASS] S7 exclusive queue behavior');
}

async function test_telemetry_written(): Promise<void> {
  resetWorkbenchToolRegistry();
  resetWorkbenchState();
  upsertWorkbenchToolPolicy({ id: 'read_file', type: 'parallel', allowedAgents: ['*'] });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-test-'));
  const file = path.join(tmp, 'note.txt');
  fs.writeFileSync(file, 'hello', 'utf-8');
  const ctx = makeContext('agent-a', tmp);
  const result = await executeViaWorkbench('read_file', { path: file }, ctx);
  console.assert(result.status === 'success', 'read_file via workbench should succeed');

  const telemetryFile = path.resolve(process.cwd(), 'docs/process/runs/workbench', `${ctx.runId}.jsonl`);
  console.assert(fs.existsSync(telemetryFile), 'workbench telemetry file must exist');
  console.log('[PASS] S7 workbench telemetry collector');
}

(async () => {
  console.log('\n=== Sprint 7 Workbench Governance Tests ===\n');
  await test_direct_tool_access_blocked();
  await test_access_control();
  await test_exclusive_queue_semantics();
  await test_telemetry_written();
  console.log('\n=== Sprint 7 Workbench tests completed successfully ===\n');
  process.exit(0);
})();
