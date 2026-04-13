import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyRoutingPolicies } from '../adaptive/AdaptiveIntelligenceEngine';
import { pruneExecutionChain } from '../optimization/ChainPruningEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'quality-degradation-'));
}

describe('Quality degradation strategy', () => {
  it('degrades to cheaper models and shorter/fewer chains under constrained budget', () => {
    const workspace = mkTmpWorkspace();
    const routingPolicyPath = path.join(workspace, 'docs/runtime/adaptive/routing-policies.json');
    fs.mkdirSync(path.dirname(routingPolicyPath), { recursive: true });
    fs.writeFileSync(
      routingPolicyPath,
      JSON.stringify(
        {
          mode: 'balanced',
          modes: {
            cost_saver: { maxTier: 'cheap' },
            balanced: { maxTier: 'medium', minTier: 'cheap' },
            quality_first: { minTier: 'medium' },
          },
          governanceAware: {
            enabled: true,
            on: {
              constrained: { maxTier: 'cheap' },
            },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const routed = applyRoutingPolicies({
      workspacePath: workspace,
      mode: 'cost_saver',
      governanceSignal: 'constrained',
      decision: {
        runId: 'r1',
        projectId: 'p1',
        taskType: 'design',
        modelTier: 'expensive',
        model: 'gpt-4.1',
        reason: 'base',
      },
    });
    expect(routed.modelTier).toBe('cheap');

    const stages = Array.from({ length: 12 }).map((_, i) => ({ id: String(i + 1), agent: 'developer', enabled: true }));
    const normal = pruneExecutionChain({ workspacePath: workspace, stages });
    const degraded = pruneExecutionChain({ workspacePath: workspace, stages, maxStagesOverride: 6 });
    expect(normal.afterCount).toBeLessThanOrEqual(12);
    expect(degraded.afterCount).toBeLessThanOrEqual(6);
    expect(degraded.afterCount).toBeLessThanOrEqual(normal.afterCount);
  });
});
