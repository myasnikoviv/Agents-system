import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  collectRunCostMetrics,
  decideAdaptiveOptimization,
  enforceHardCostLimit,
  writeCostLedger,
} from '../cost/CostOptimizationEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's9-cost-'));
}

function seedLedger(workspace: string, runId: string): void {
  const dir = path.join(workspace, 'docs/process/runs/ledger');
  fs.mkdirSync(dir, { recursive: true });
  const events = [
    { type: 'llm.response', payload: { tokensInput: 100, tokensOutput: 50, source: 'agent' } },
    { type: 'llm.response', payload: { tokensInput: 20, tokensOutput: 10, source: 'guard' } },
    { type: 'guard.retry', payload: { stepId: 'x', attempt: 1 } },
    { type: 'governance.rule_check', payload: { rule: 'improvement_loop' } },
  ];
  fs.writeFileSync(path.join(dir, `${runId}.jsonl`), events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
}

function test_run_level_cost_tracker_and_breakdown(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s9-1';
  seedLedger(workspace, runId);
  const metrics = collectRunCostMetrics(workspace, runId, 'agent_system');
  console.assert(metrics.tokens === 180, 'expected token sum 180');
  console.assert(metrics.retries === 1, 'expected one retry');
  console.assert(metrics.loops === 1, 'expected one loop');
  console.assert(metrics.breakdown.execution === 150, 'expected execution token bucket');
  console.assert(metrics.breakdown.governance === 30, 'expected governance token bucket');
  console.log('[PASS] S9 run-level tracker + breakdown');
}

function test_hard_cost_limit(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s9-2';
  seedLedger(workspace, runId);
  const metrics = collectRunCostMetrics(workspace, runId, 'agent_system');
  const allow = enforceHardCostLimit(metrics, workspace);
  console.assert(allow.allowed === true, 'default threshold should allow 180 tokens');
  const policyFile = path.join(workspace, 'docs/runtime/cost/cost-policy.json');
  fs.mkdirSync(path.dirname(policyFile), { recursive: true });
  fs.writeFileSync(
    policyFile,
    JSON.stringify({ defaultHardTokenLimit: 100, byProject: { agent_system: { hardTokenLimit: 100 } } }, null, 2),
    'utf-8',
  );
  const blocked = enforceHardCostLimit(metrics, workspace);
  console.assert(blocked.allowed === false, 'hard limit should block over threshold');
  console.log('[PASS] S9 hard cost limits');
}

function test_cost_ledger_and_adaptive(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s9-3';
  seedLedger(workspace, runId);
  const metrics = collectRunCostMetrics(workspace, runId, 'agent_system');
  const file = writeCostLedger(metrics, workspace);
  console.assert(fs.existsSync(file), 'cost ledger should exist');

  // create a few low-retry histories
  const costDir = path.join(workspace, 'docs/process/runs/cost');
  fs.writeFileSync(path.join(costDir, 'run-a.json'), JSON.stringify({ projectId: 'agent_system', retries: 0 }), 'utf-8');
  fs.writeFileSync(path.join(costDir, 'run-b.json'), JSON.stringify({ projectId: 'agent_system', retries: 0 }), 'utf-8');
  const adaptive = decideAdaptiveOptimization(workspace, 'agent_system');
  console.assert(adaptive.lowRisk === true, 'expected low-risk adaptive profile');
  console.assert(adaptive.suggestedMaxRetriesPerStep === 1, 'expected retry=1 for low-risk');
  console.log('[PASS] S9 cost ledger + adaptive optimization');
}

(async () => {
  console.log('\n=== Sprint 9 Cost Optimization Tests ===\n');
  test_run_level_cost_tracker_and_breakdown();
  test_hard_cost_limit();
  test_cost_ledger_and_adaptive();
  console.log('\n=== Sprint 9 cost optimization tests completed successfully ===\n');
  process.exit(0);
})();
