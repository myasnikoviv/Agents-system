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
      '    triggerPhases: [BEFORE_RUN]',
      '    evidence: [docs/process/git/preflights/<ticket>.env]',
      '    evaluationType: deterministic',
      '    deterministicCheck: preflight_token',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '  - id: ticket_context_required',
      '    triggerPhases: [BEFORE_RUN]',
      '    evidence: [runtime ticket context]',
      '    evaluationType: deterministic',
      '    deterministicCheck: ticket_context_present',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '  - id: postflight_evidence',
      '    triggerPhases: [AFTER_RUN]',
      '    evidence: [docs/process/tests/<ticket>.md]',
      '    evaluationType: deterministic',
      '    deterministicCheck: postflight_report',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '  - id: improvement_loop',
      '    triggerPhases: [AFTER_RUN]',
      '    evidence: [docs/process/retrospectives/**]',
      '    evaluationType: deterministic',
      '    deterministicCheck: improvement_artifact',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: required_agent_usage',
      '    triggerPhases: [AFTER_STEP]',
      '    evidence: [agent.started events]',
      '    evaluationType: deterministic',
      '    deterministicCheck: agent_usage_events',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: required_pipeline_usage',
      '    triggerPhases: [AFTER_STEP]',
      '    evidence: [stage.started events]',
      '    evaluationType: deterministic',
      '    deterministicCheck: pipeline_usage_events',
      '    enforcementMode: soft',
      '    enabledByDefault: true',
      '  - id: cost_guard_light',
      '    triggerPhases: [AFTER_RUN]',
      '    evidence: [token telemetry]',
      '    evaluationType: deterministic',
      '    deterministicCheck: cost_guard_tokens',
      '    enforcementMode: advisory',
      '    enabledByDefault: true',
      '  - id: loop_guard_hard',
      '    triggerPhases: [AFTER_RUN]',
      '    evidence: [guard.retry events]',
      '    evaluationType: deterministic',
      '    deterministicCheck: loop_pressure_hard',
      '    enforcementMode: hard',
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
          'ticket_context_required',
          'postflight_evidence',
          'improvement_loop',
          'required_agent_usage',
          'required_pipeline_usage',
          'cost_guard_light',
          'loop_guard_hard',
        ],
        projects: {
          agent_system: {
            enabledRules: [
              'git_preflight',
              'ticket_context_required',
              'postflight_evidence',
              'improvement_loop',
              'required_agent_usage',
              'required_pipeline_usage',
              'cost_guard_light',
              'loop_guard_hard',
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
  const result = await runGovernancePhase('BEFORE_RUN', {
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
  const result = await runGovernancePhase('AFTER_STEP', {
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
  console.assert(result.phase === 'BEFORE_RUN', 'expected normalized phase BEFORE_RUN');
  console.log('[PASS] core supports governance phase alias pre_execution');
}

async function test_before_task_close_blocks_without_report(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('AFTER_RUN', {
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

async function test_ticket_context_hard_gate_blocks_invalid_ticket(): Promise<void> {
  const workspace = makeWorkspace();
  const result = await runGovernancePhase('BEFORE_RUN', {
    runId: 'run-ticket-ctx-1',
    projectId: 'agent_system',
    ticketId: 'invalid-ticket',
    chainId: 'thread-ticket-ctx',
    workspacePath: workspace,
    pipelineId: 'refactor',
    hasMutatingAction: false,
  });
  console.assert(result.blocked === true, 'expected invalid ticket context to block');
  console.assert(result.action === 'block', 'expected block action for invalid ticket context');
  console.log('[PASS] ticket context hard gate blocks invalid ticket');
}

async function test_loop_guard_hard_blocks_excessive_retry_pressure(): Promise<void> {
  const workspace = makeWorkspace();
  fs.mkdirSync(path.join(workspace, 'docs/process/tests'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'docs/process/retrospectives'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'docs/process/runs/ledger'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'docs/process/tests/AGSYS-LOOP-1.md'), '# ok', 'utf-8');
  fs.writeFileSync(path.join(workspace, 'docs/process/retrospectives/AGSYS-LOOP-1.md'), '# ok', 'utf-8');
  const ledgerRows = Array.from({ length: 5 }).map(() => JSON.stringify({ type: 'guard.retry', payload: {} }));
  fs.writeFileSync(
    path.join(workspace, 'docs/process/runs/ledger/run-loop-1.jsonl'),
    `${ledgerRows.join('\n')}\n`,
    'utf-8',
  );

  process.env.GOVERNANCE_MAX_RETRY_LOOPS = '3';
  const result = await runGovernancePhase('AFTER_RUN', {
    runId: 'run-loop-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-LOOP-1',
    chainId: 'thread-loop',
    workspacePath: workspace,
    pipelineId: 'sprint-integration',
    hasMutatingAction: false,
  });
  console.assert(result.blocked === true, 'expected loop pressure hard gate to block');
  console.assert(result.action === 'block', 'expected hard block on excessive retries');
  console.log('[PASS] loop guard hard gate blocks excessive retry pressure');
}

async function test_soft_gate_escalation_after_retry_and_warn_budget(): Promise<void> {
  const workspace = makeWorkspace();
  const runId = 'run-escalation-1';
  const baseCtx = {
    runId,
    projectId: 'agent_system',
    ticketId: 'AGSYS-ESC-1',
    chainId: 'thread-escalation',
    workspacePath: workspace,
    pipelineId: 'refactor',
    hasMutatingAction: false,
  } as const;

  const first = await runGovernancePhase('AFTER_STEP', baseCtx);
  const second = await runGovernancePhase('AFTER_STEP', baseCtx);
  const third = await runGovernancePhase('AFTER_STEP', baseCtx);
  console.assert(first.action === 'retry', 'expected first soft failure action=retry');
  console.assert(second.action === 'warn', 'expected second soft failure action=warn');
  console.assert(third.action === 'escalate', 'expected third soft failure action=escalate');
  console.log('[PASS] soft gate escalates after retry and warn budgets are exhausted');
}

(async () => {
  console.log('\n=== Governance Engine Core Tests ===\n');
  await test_hard_gate_blocks_without_preflight();
  await test_soft_gate_requests_retry();
  await test_phase_alias_pre_execution_supported();
  await test_before_task_close_blocks_without_report();
  await test_ticket_context_hard_gate_blocks_invalid_ticket();
  await test_loop_guard_hard_blocks_excessive_retry_pressure();
  await test_soft_gate_escalation_after_retry_and_warn_budget();
  console.log('\n=== Governance Engine Core tests completed successfully ===\n');
  process.exit(0);
})();
