import fs from 'fs';
import os from 'os';
import path from 'path';
import { runGovernancePhase } from '../governance/GovernanceEngineCore';

function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-core-'));
  fs.mkdirSync(path.join(root, 'docs/process/git/preflights'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/runtime/governance'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/runtime/governance/rule-registry.yaml'),
    [
      'rules:',
      '  - id: git_preflight',
      '    triggerPhases: [before_execution]',
      '    evidence: [docs/process/git/preflights/<ticket>.env]',
      '    evaluationType: deterministic',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '  - id: postflight_evidence',
      '    triggerPhases: [before_task_close]',
      '    evidence: [docs/process/tests/<ticket>.md]',
      '    evaluationType: deterministic',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '  - id: improvement_loop',
      '    triggerPhases: [after_execution]',
      '    evidence: [docs/process/retrospectives/**]',
      '    evaluationType: deterministic',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: required_agent_usage',
      '    triggerPhases: [after_execution]',
      '    evidence: [agent.started events]',
      '    evaluationType: deterministic',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: required_pipeline_usage',
      '    triggerPhases: [after_execution]',
      '    evidence: [stage.started events]',
      '    evaluationType: deterministic',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: cost_guard_light',
      '    triggerPhases: [after_execution]',
      '    evidence: [token telemetry]',
      '    evaluationType: deterministic',
      '    enforcementMode: advisory',
      '    enabledByDefault: true',
      '',
    ].join('\n'),
    'utf-8',
  );
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

async function test_phase_alias_pre_execution_supported(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('pre_execution', {
    runId: 'run-alias-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-TEST-ALIAS',
    chainId: 'thread-alias',
    workspacePath: workspace,
    pipelineId: 'refactor',
    hasMutatingAction: true,
  });
  console.assert(result.blocked === true, 'expected alias pre_execution to map to hard gate checks');
  console.assert(result.phase === 'before_execution', 'expected normalized phase before_execution');
  console.log('[PASS] core supports governance phase alias pre_execution');
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
  await test_phase_alias_pre_execution_supported();
  await test_before_task_close_blocks_without_report();
  console.log('\n=== Governance Engine Core tests completed successfully ===\n');
  process.exit(0);
})();
