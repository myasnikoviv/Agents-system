import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyRoutingPolicies } from '../adaptive/AdaptiveIntelligenceEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'routing-policy-'));
}

describe('Routing policies (cost vs quality)', () => {
  it('applies configurable tradeoff mode and governance-aware cap', () => {
    const workspace = mkTmpWorkspace();
    const file = path.join(workspace, 'docs/runtime/adaptive/routing-policies.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          mode: 'quality_first',
          modes: {
            cost_saver: { maxTier: 'cheap' },
            balanced: { maxTier: 'medium', minTier: 'cheap' },
            quality_first: { minTier: 'medium' },
          },
          governanceAware: {
            enabled: true,
            on: {
              caution: { maxTier: 'medium' },
              constrained: { maxTier: 'cheap' },
            },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const qualityFirst = applyRoutingPolicies({
      workspacePath: workspace,
      mode: 'quality_first',
      governanceSignal: 'normal',
      decision: {
        runId: 'r1',
        projectId: 'p1',
        taskType: 'general',
        modelTier: 'cheap',
        model: 'gpt-4o-mini',
        reason: 'base',
      },
    });
    expect(qualityFirst.modelTier).toBe('medium');

    const constrained = applyRoutingPolicies({
      workspacePath: workspace,
      mode: 'quality_first',
      governanceSignal: 'constrained',
      decision: {
        runId: 'r2',
        projectId: 'p1',
        taskType: 'design',
        modelTier: 'expensive',
        model: 'gpt-4.1',
        reason: 'base',
      },
    });
    expect(constrained.modelTier).toBe('cheap');
  });
});
