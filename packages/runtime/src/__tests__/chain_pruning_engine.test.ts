import fs from 'fs';
import os from 'os';
import path from 'path';
import { pruneExecutionChain, writeChainPruningReport } from '../optimization/ChainPruningEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chain-pruning-'));
}

describe('ChainPruningEngine', () => {
  it('removes redundant stages and reports measurable LLM-call reduction', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/chain-optimization-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(
      policyPath,
      JSON.stringify(
        {
          dedupeByStageId: true,
          dedupeConsecutiveByAgent: true,
          dropDisabledStages: true,
          maxStagesPerRun: 10,
        },
        null,
        2,
      ),
      'utf-8',
    );

    const stages = [
      { id: '1', agent: 'pm-orchestrator', enabled: true },
      { id: '1', agent: 'pm-orchestrator', enabled: true },
      { id: '2', agent: 'developer', enabled: true },
      { id: '3', agent: 'developer', enabled: true },
      { id: '4', agent: 'qa', enabled: false },
      { id: '5', agent: 'qa', enabled: true },
    ];
    const result = pruneExecutionChain({ workspacePath: workspace, stages });
    expect(result.beforeCount).toBe(6);
    expect(result.afterCount).toBe(3);
    expect(result.prunedCount).toBe(3);
    expect(result.measurableImprovementPct).toBe(50);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.stages.map((s) => String(s.id))).toEqual(['1', '2', '5']);

    const report = writeChainPruningReport(workspace, 'run-prune-1', {
      pipelineId: 'new-feature',
      beforeCount: result.beforeCount,
      afterCount: result.afterCount,
      prunedCount: result.prunedCount,
      estimatedLlmCallsBefore: result.estimatedLlmCallsBefore,
      estimatedLlmCallsAfter: result.estimatedLlmCallsAfter,
      measurableImprovementPct: result.measurableImprovementPct,
      reasons: result.reasons,
    });
    expect(fs.existsSync(report)).toBe(true);
  });
});
