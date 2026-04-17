import fs from 'fs';
import os from 'os';
import path from 'path';
import { collectRunCostMetrics, decideAdaptiveOptimization } from '../cost/CostOptimizationEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cost-layer-'));
}

describe('CostOptimizationLayer', () => {
  it('collects token/retry metrics and derives adaptive retry policy', () => {
    const workspace = mkTmpWorkspace();
    const ledgerDir = path.join(workspace, 'docs/process/runs/ledger');
    fs.mkdirSync(ledgerDir, { recursive: true });
    const runId = 'run-cost-1';
    const ledgerPath = path.join(ledgerDir, `${runId}.jsonl`);
    fs.writeFileSync(
      ledgerPath,
      [
        JSON.stringify({
          type: 'llm.response',
          actor: { id: 'developer' },
          payload: { tokensInput: 100, tokensOutput: 50, source: 'agent', stageId: 'implementation' },
        }),
        JSON.stringify({
          type: 'llm.response',
          actor: { id: 'pm-orchestrator' },
          payload: { tokensInput: 20, tokensOutput: 10, source: 'guard', stageId: 'governance' },
        }),
        JSON.stringify({ type: 'usage.tool_execution', payload: { quantity: 2, unit: 'calls' } }),
        JSON.stringify({ type: 'usage.runtime_time', payload: { quantity: 3, unit: 'seconds' } }),
        JSON.stringify({ type: 'guard.retry', payload: { attempt: 1 } }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const metrics = collectRunCostMetrics(workspace, runId, 'proj-a');
    expect(metrics.tokens).toBe(180);
    expect(metrics.toolExecutions).toBe(2);
    expect(metrics.runtimeSeconds).toBe(3);
    expect(metrics.retries).toBe(1);
    expect(metrics.breakdown.execution).toBe(150);
    expect(metrics.breakdown.governance).toBe(30);
    expect(metrics.monetary.currency).toBe('USD');
    expect(metrics.monetary.tokenCostUsd).toBeCloseTo(0.0018, 6);
    expect(metrics.monetary.toolCostUsd).toBeCloseTo(0.002, 6);
    expect(metrics.monetary.runtimeCostUsd).toBeCloseTo(0.0003, 6);
    expect(metrics.monetary.totalCostUsd).toBeCloseTo(0.0041, 6);
    expect(metrics.monetary.rates.per1kTokensUsd).toBeGreaterThan(0);
    expect(metrics.monetary.byAgentUsd.developer).toBeGreaterThan(0);
    expect(metrics.monetary.byStepUsd.implementation).toBeGreaterThan(0);

    const costOutDir = path.join(workspace, 'docs/process/runs/cost');
    fs.mkdirSync(costOutDir, { recursive: true });
    fs.writeFileSync(
      path.join(costOutDir, `${runId}.json`),
      JSON.stringify({ runId, projectId: 'proj-a', retries: 0 }, null, 2),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(costOutDir, `run-cost-2.json`),
      JSON.stringify({ runId: 'run-cost-2', projectId: 'proj-a', retries: 0 }, null, 2),
      'utf-8',
    );
    const adaptive = decideAdaptiveOptimization(workspace, 'proj-a');
    expect(adaptive.lowRisk).toBe(true);
    expect(adaptive.suggestedMaxRetriesPerStep).toBe(1);
  });
});
