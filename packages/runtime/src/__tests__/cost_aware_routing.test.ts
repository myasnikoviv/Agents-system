import { applyCostAwareTierPolicy } from '../adaptive/AdaptiveIntelligenceEngine';

describe('Cost-aware routing policy', () => {
  it('caps expensive tier for free plan', () => {
    const result = applyCostAwareTierPolicy({
      workspacePath: process.cwd(),
      planName: 'free',
      decision: {
        runId: 'r1',
        projectId: 'p1',
        taskType: 'general',
        modelTier: 'expensive',
        model: 'openai/gpt-5.4',
        reason: 'base',
      },
    });
    expect(result.modelTier).toBe('cheap');
  });
});

