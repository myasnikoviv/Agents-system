import fs from 'fs';
import os from 'os';
import path from 'path';
import { CostBreakdownService } from '../cost/CostBreakdownService';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cost-breakdown-'));
}

describe('CostBreakdownService', () => {
  it('aggregates per run, per agent, and per workspace', () => {
    const workspace = mkTmpWorkspace();
    const dir = path.join(workspace, 'docs/process/runs/cost');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'run-1.json'),
      JSON.stringify(
        {
          runId: 'run-1',
          projectId: 'p1',
          workspaceId: 'w1',
          tokens: 100,
          toolExecutions: 1,
          runtimeSeconds: 2,
          monetary: {
            totalCostUsd: 1.2,
            byAgentUsd: { developer: 1.0, 'pm-orchestrator': 0.2 },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(dir, 'run-2.json'),
      JSON.stringify(
        {
          runId: 'run-2',
          projectId: 'p1',
          workspaceId: 'w1',
          tokens: 200,
          toolExecutions: 2,
          runtimeSeconds: 3,
          monetary: {
            totalCostUsd: 2.4,
            byAgentUsd: { developer: 2.0, 'tdd-qa': 0.4 },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const service = new CostBreakdownService();
    const result = service.aggregate(workspace, { projectId: 'p1' });
    expect(result.perRun.length).toBe(2);
    expect(result.perAgent.developer).toBeCloseTo(3.0, 6);
    expect(result.perAgent['pm-orchestrator']).toBeCloseTo(0.2, 6);
    expect(result.perWorkspace.w1).toBeCloseTo(3.6, 6);
  });
});
