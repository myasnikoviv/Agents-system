import fs from 'fs';
import os from 'os';
import path from 'path';
import { routeModelForTask } from '../adaptive/AdaptiveIntelligenceEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's33-model-router-'));
}

describe('Model selection engine (Sprint 33)', () => {
  it('applies cheap-first strategy, quality tiers, and deterministic fallback', () => {
    const workspace = mkTmpWorkspace();
    const policyPath = path.join(workspace, 'docs/runtime/adaptive/model-routing-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(
      policyPath,
      JSON.stringify(
        {
          defaultTier: 'medium',
          taskTypeToTier: {
            classification: 'cheap',
            design: 'expensive',
            general: 'medium',
          },
          tierToModel: {
            cheap: 'gemini-2.5-flash',
            medium: 'gpt-4o',
            expensive: 'gpt-4.1',
          },
          fallbackByTier: {
            cheap: ['gemini-2.5-flash'],
            medium: ['gpt-4o', 'gemini-2.5-flash'],
            expensive: ['gpt-4.1', 'gpt-4o', 'gemini-2.5-flash'],
          },
          unavailableModels: ['gpt-4.1'],
        },
        null,
        2,
      ),
      'utf-8',
    );

    const cheap = routeModelForTask({
      workspacePath: workspace,
      runId: 'run-1',
      projectId: 'proj',
      userMessage: 'classify and route this quickly',
    });
    expect(cheap.modelTier).toBe('cheap');
    expect(cheap.model).toBe('gemini-2.5-flash');

    const expensive = routeModelForTask({
      workspacePath: workspace,
      runId: 'run-2',
      projectId: 'proj',
      userMessage: 'need architecture design for this subsystem',
    });
    expect(expensive.modelTier).toBe('expensive');
    expect(expensive.model).toBe('gpt-4o');
  });
});
