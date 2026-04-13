import fs from 'fs';
import os from 'os';
import path from 'path';
import { aggregateCostLedgers, collectRunCostMetrics, writeCostLedger } from '../cost/CostOptimizationEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cost-int-'));
}

function seedLedger(workspace: string, runId: string, tokenIn: number, tokenOut: number): void {
  const ledgerDir = path.join(workspace, 'docs/process/runs/ledger');
  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, `${runId}.jsonl`),
    [
      JSON.stringify({
        type: 'llm.response',
        actor: { id: 'developer' },
        payload: { tokensInput: tokenIn, tokensOutput: tokenOut, source: 'agent', stageId: 'implementation' },
      }),
      JSON.stringify({ type: 'usage.tool_execution', payload: { quantity: 1, unit: 'calls' } }),
      JSON.stringify({ type: 'usage.runtime_time', payload: { quantity: 2, unit: 'seconds' } }),
    ].join('\n') + '\n',
    'utf-8',
  );
}

describe('Cost tracking integration', () => {
  it('tracks per-run + per-step and aggregates costs by project', () => {
    const workspace = mkTmpWorkspace();

    seedLedger(workspace, 'run-a', 100, 50);
    seedLedger(workspace, 'run-b', 200, 100);

    const metricsA = collectRunCostMetrics(workspace, 'run-a', 'proj-a');
    const metricsB = collectRunCostMetrics(workspace, 'run-b', 'proj-a');

    expect(metricsA.monetary.totalCostUsd).toBeGreaterThan(0);
    expect(metricsA.monetary.byStepUsd.implementation).toBeGreaterThan(0);
    expect(metricsB.monetary.totalCostUsd).toBeGreaterThan(metricsA.monetary.totalCostUsd);

    writeCostLedger(metricsA, workspace);
    writeCostLedger(metricsB, workspace);

    const aggregated = aggregateCostLedgers(workspace, { projectId: 'proj-a' });
    expect(aggregated.runs).toBe(2);
    expect(aggregated.totals.tokens).toBe(450);
    expect(aggregated.totals.toolExecutions).toBe(2);
    expect(aggregated.totals.runtimeSeconds).toBe(4);
    expect(aggregated.totals.totalCostUsd).toBeGreaterThan(0);
    expect(aggregated.byProject['proj-a'].runs).toBe(2);
  });
});
