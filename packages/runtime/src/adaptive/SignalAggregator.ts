import { getRedisClient } from '../redisClient';
import { RuntimeSignal } from './SignalCollector';
import { scoreAgentPerformance, AgentPerformanceInput, AgentPerformanceScore } from '../performance/AgentPerformanceScoring';

/**
 * Sprint 35B — Self-Improvement Signals
 * Aggregates raw telemetry events into structured dataset for pattern detection.
 */
export class SignalAggregator {
  private redis = getRedisClient();

  /**
   * Aggregates raw signals for a given asset/project from Redis.
   * Returns a performance score which can be used to trigger adaptive policies.
   */
  async aggregateSignals(projectId: string, assetId: string): Promise<AgentPerformanceScore | null> {
    const key = `signals:${projectId}:${assetId}`;
    
    try {
      const rawSignals = await this.redis.lrange(key, 0, -1);
      if (!rawSignals || rawSignals.length === 0) return null;

      const signals: RuntimeSignal[] = rawSignals.map(s => JSON.parse(s));
      return this.aggregateSlice(assetId, signals);
    } catch (e) {
      console.error(`[SignalAggregator] Failed to aggregate signals for ${assetId}:`, e);
      return null;
    }
  }

  /**
   * Aggregates a given slice of signals into a performance score.
   */
  aggregateSlice(assetId: string, signals: RuntimeSignal[]): AgentPerformanceScore {
    let failedTaskCount = 0;
    let retryTaskCount = 0;
    let totalDurationMs = 0;
    let latencyCount = 0;
    let tokenUsage = 0;

    for (const signal of signals) {
      switch (signal.type) {
        case 'latency':
          totalDurationMs += Number(signal.value);
          latencyCount++;
          break;
        case 'token_usage':
          tokenUsage += Number(signal.value);
          break;
        case 'failure':
          failedTaskCount++;
          break;
        case 'retry':
          retryTaskCount++;
          break;
      }
    }

    const successfulTaskCount = Math.max(0, latencyCount - failedTaskCount);

    const input: AgentPerformanceInput = {
      agentSlug: assetId,
      invocationCount: latencyCount,
      successfulTaskCount,
      failedTaskCount,
      retryTaskCount,
      avgTaskDurationMs: latencyCount > 0 ? totalDurationMs / latencyCount : 0,
      tokenUsage
    };

    return scoreAgentPerformance(input);
  }

  /**
   * Helper to fetch aggregated stats for multiple assets in a project.
   */
  async aggregateProject(projectId: string, assetIds: string[]): Promise<Record<string, AgentPerformanceScore>> {
    const results: Record<string, AgentPerformanceScore> = {};
    for (const assetId of assetIds) {
      const score = await this.aggregateSignals(projectId, assetId);
      if (score) results[assetId] = score;
    }
    return results;
  }
}

export const signalAggregator = new SignalAggregator();
