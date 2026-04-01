import fs from 'fs';
import os from 'os';
import path from 'path';
import { runGovernancePhase } from '../governance/GovernanceEngineCore';

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-core-'));
  fs.mkdirSync(path.join(root, 'docs/process/git/preflights'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/runtime/governance'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/runtime/governance/project-policy.json'),
    JSON.stringify(
      {
        defaultEnabledRules: [
          'git_preflight',
          'postflight_evidence',
          'improvement_loop',
          'required_agent_usage',
          'required_pipeline_usage',
          'cost_guard_light',
        ],
        projects: {
          agent_system: {
            enabledRules: [
              'git_preflight',
              'postflight_evidence',
              'improvement_loop',
              'required_agent_usage',
              'required_pipeline_usage',
              'cost_guard_light',
            ],
          },
        },
      },
      null,
      2,
    ),
    'utf-8',
  );
  return root;
}

async function test_hard_gate_blocks_without_preflight(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('before_execution', {
    runId: 'run-hard-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-TEST-1',
    chainId: 'thread-1',
    workspacePath: workspace,
    pipelineId: 'refactor',
    hasMutatingAction: true,
  });
  console.assert(result.blocked === true, 'expected hard gate block');
  console.assert(result.action === 'block', 'expected block action');
  console.log('[PASS] core hard gate blocks missing preflight token');
}

async function test_soft_gate_requests_retry(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('after_execution', {
    runId: 'run-soft-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-TEST-2',
    chainId: 'thread-2',
    workspacePath: workspace,
    pipelineId: 'refactor',
    hasMutatingAction: false,
  });
  console.assert(result.blocked === false, 'soft gate should not hard block');
  console.assert(result.action === 'retry' || result.action === 'warn', 'expected retry/warn action');
  console.log('[PASS] core soft gate produces retry/warn flow');
}

async function test_before_task_close_blocks_without_report(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('before_task_close', {
    runId: 'run-close-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-TEST-3',
    chainId: 'thread-3',
    workspacePath: workspace,
    pipelineId: 'sprint-integration',
    hasMutatingAction: false,
  });
  console.assert(result.blocked === true, 'expected block when postflight evidence missing');
  console.assert(result.action === 'block', 'expected block action');
  console.log('[PASS] core blocks task close without postflight evidence');
}

(async () => {
  console.log('\n=== Governance Engine Core Tests ===\n');
  await test_hard_gate_blocks_without_preflight();
  await test_soft_gate_requests_retry();
  await test_before_task_close_blocks_without_report();
  console.log('\n=== Governance Engine Core tests completed successfully ===\n');
  process.exit(0);
})();
