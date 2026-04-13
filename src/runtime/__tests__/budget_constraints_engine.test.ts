import fs from 'fs';
import os from 'os';
import path from 'path';
import { collectRunCostMetrics, enforceBudgetConstraints } from '../cost/CostOptimizationEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'budget-engine-'));
}

function seedLedger(workspace: string, runId: string, tokens: number): void {
  const ledgerDir = path.join(workspace, 'docs/process/runs/ledger');
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, `${runId}.jsonl`),
    [
      JSON.stringify({
        type: 'llm.response',
        actor: { id: 'developer' },
        payload: { tokensInput: tokens, tokensOutput: 0, source: 'agent', stageId: 'implementation' },
      }),
    ].join('\n') + '\n',
    'utf-8',
  );
}

describe('BudgetConstraintsEngine', () => {
  it('supports budget ok, soft exceed, and hard exceed states', () => {
    const workspace = mkTmpWorkspace();
    const budgetPolicyPath = path.join(workspace, 'docs/runtime/cost/budget-policy.json');
    fs.mkdirSync(path.dirname(budgetPolicyPath), { recursive: true });
    fs.writeFileSync(
      budgetPolicyPath,
      JSON.stringify(
        {
          defaultMaxCostUsdPerRun: 0.01,
          defaultSoftDegradeRatio: 0.8,
        },
        null,
        2,
      ),
      'utf-8',
    );
    const costPolicyPath = path.join(workspace, 'docs/runtime/cost/cost-policy.json');
    fs.writeFileSync(
      costPolicyPath,
      JSON.stringify(
        {
          rates: {
            per1kTokensUsd: 1.0,
            perToolExecutionUsd: 0,
            perRuntimeSecondUsd: 0,
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    seedLedger(workspace, 'run-ok', 5); // $0.005
    const okMetrics = collectRunCostMetrics(workspace, 'run-ok', 'proj');
    const ok = enforceBudgetConstraints(okMetrics, workspace);
    expect(ok.allowed).toBe(true);
    expect(ok.softExceeded).toBe(false);

    seedLedger(workspace, 'run-soft', 9); // $0.009
    const softMetrics = collectRunCostMetrics(workspace, 'run-soft', 'proj');
    const soft = enforceBudgetConstraints(softMetrics, workspace);
    expect(soft.allowed).toBe(true);
    expect(soft.softExceeded).toBe(true);
    expect(soft.reason).toContain('soft_budget_exceeded');

    seedLedger(workspace, 'run-hard', 11); // $0.011
    const hardMetrics = collectRunCostMetrics(workspace, 'run-hard', 'proj');
    const hard = enforceBudgetConstraints(hardMetrics, workspace);
    expect(hard.allowed).toBe(false);
    expect(hard.softExceeded).toBe(true);
    expect(hard.reason).toContain('hard_budget_exceeded');
  });
});
