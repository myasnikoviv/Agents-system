import { scoreAgentPerformance } from '../performance/AgentPerformanceScoring';

describe('AgentPerformanceScoring', () => {
  it('returns higher score for better reliability and lower latency/cost', () => {
    const strong = scoreAgentPerformance({
      agentSlug: 'developer',
      invocationCount: 10,
      successfulTaskCount: 10,
      failedTaskCount: 0,
      retryTaskCount: 0,
      avgTaskDurationMs: 1000,
      tokenUsage: 1200,
    });
    const weak = scoreAgentPerformance({
      agentSlug: 'developer',
      invocationCount: 10,
      successfulTaskCount: 5,
      failedTaskCount: 5,
      retryTaskCount: 6,
      avgTaskDurationMs: 35000,
      tokenUsage: 90000,
    });

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.successRate).toBeGreaterThan(weak.successRate);
  });
});
