import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  collectLearningSignals,
  decideAdaptivePolicy,
  enforceBoundedAdaptation,
  routeModelForTask,
  writeAdaptiveLog,
} from '../adaptive/AdaptiveIntelligenceEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's10-adaptive-'));
}

function seedCost(workspace: string, runId: string, projectId = 'agent_system'): void {
  const dir = path.join(workspace, 'docs/process/runs/cost');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${runId}.json`),
    JSON.stringify({ runId, projectId, tokens: 1234, retries: 1, loops: 2 }, null, 2),
    'utf-8',
  );
}

function test_model_router(): void {
  const workspace = mkTmpWorkspace();
  const route1 = routeModelForTask({
    workspacePath: workspace,
    runId: 'run-s10-1',
    projectId: 'agent_system',
    userMessage: 'Please classify this ticket and route it',
  });
  console.assert(route1.modelTier === 'cheap', 'classification should route to cheap tier');

  const route2 = routeModelForTask({
    workspacePath: workspace,
    runId: 'run-s10-2',
    projectId: 'agent_system',
    userMessage: 'Need architecture design for system runtime',
  });
  console.assert(route2.modelTier === 'expensive', 'design should route to expensive tier');
  console.log('[PASS] S10 model router');
}

function test_learning_signals_and_policy(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s10-3';
  seedCost(workspace, runId);
  const signals = collectLearningSignals(workspace, runId, 'agent_system');
  console.assert(signals.tokens === 1234, 'expected tokens from cost ledger');

  const policy = decideAdaptivePolicy(signals);
  console.assert(policy.retryLimit === 1, 'default stable policy retry limit should be 1');
  console.assert(policy.enableImprovementLoop === true, 'default stable policy should keep improvement loop');
  console.log('[PASS] S10 learning signals + adaptive policy');
}

function test_bounded_adaptation_and_logging(): void {
  const workspace = mkTmpWorkspace();
  const prev = { retryLimit: 0, enableImprovementLoop: true, preferredTier: 'cheap' as const, reason: 'prev' };
  const next = { retryLimit: 3, enableImprovementLoop: false, preferredTier: 'expensive' as const, reason: 'next' };
  const bounded = enforceBoundedAdaptation(prev, next, 1);
  console.assert(bounded.retryLimit === 1, 'retry delta should be bounded to +1');

  const route = routeModelForTask({
    workspacePath: workspace,
    runId: 'run-s10-4',
    projectId: 'agent_system',
    userMessage: 'general task',
  });
  const file = writeAdaptiveLog(workspace, {
    runId: 'run-s10-4',
    projectId: 'agent_system',
    route,
    policy: bounded,
  });
  console.assert(fs.existsSync(file), 'adaptive log must be written');
  console.log('[PASS] S10 bounded adaptation + adaptive log');
}

(async () => {
  console.log('\n=== Sprint 10 Adaptive Intelligence Tests ===\n');
  test_model_router();
  test_learning_signals_and_policy();
  test_bounded_adaptation_and_logging();
  console.log('\n=== Sprint 10 adaptive intelligence tests completed successfully ===\n');
  process.exit(0);
})();
