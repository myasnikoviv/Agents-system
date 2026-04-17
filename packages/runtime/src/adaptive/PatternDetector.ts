import { getRedisClient } from '../redisClient';
import { RuntimeSignal } from './SignalCollector';
import { signalAggregator } from './SignalAggregator';

/**
 * Sprint 35B — Self-Improvement Signals
 * Pattern types detected by comparing recent vs historical sliding windows.
 */
export type PatternType = 'SUCCESS_DETERIORATION' | 'TOKEN_SPIKE' | 'LATENCY_DRIFT' | 'STABLE' | 'SYSTEM_ERROR';

export interface DetectedPattern {
  type: PatternType;
  severity: 'info' | 'warn' | 'critical';
  detail: string;
  comparison: {
    recent: any;
    historical: any;
    zScore?: number;
  };
}

export class PatternDetector {
  private redis = getRedisClient();

  /**
   * Analyzes the signal history for an asset to detect patterns/trends.
   * Uses statistical Z-scores for adaptive thresholding.
   */
  async detectPatterns(projectId: string, assetId: string): Promise<DetectedPattern[]> {
    const key = `signals:${projectId}:${assetId}`;
    
    try {
      const rawSignals = await this.redis.lrange(key, 0, -1);
      if (!rawSignals || rawSignals.length < 10) return [];

      const signals: RuntimeSignal[] = rawSignals.map(s => JSON.parse(s));
      const splitIndex = Math.max(2, Math.floor(signals.length * 0.2));
      const recentSignals = signals.slice(0, splitIndex);
      const historicalSignals = signals.slice(splitIndex);

      const recentScore = signalAggregator.aggregateSlice(assetId, recentSignals);
      const historicalScore = signalAggregator.aggregateSlice(assetId, historicalSignals);

      const patterns: DetectedPattern[] = [];

      // --- 1. Success Deterioration Check ---
      const successDelta = historicalScore.successRate - recentScore.successRate;
      if (successDelta > 0.15) {
        patterns.push({
          type: 'SUCCESS_DETERIORATION',
          severity: successDelta > 0.4 ? 'critical' : 'warn',
          detail: `Success rate dropped from ${Math.round(historicalScore.successRate * 100)}% to ${Math.round(recentScore.successRate * 100)}%`,
          comparison: { recent: recentScore.successRate, historical: historicalScore.successRate }
        });
      }

      // --- 2. Adaptive Latency Drift Check (Z-score) ---
      const historicalLatencies = historicalSignals
        .filter(s => s.type === 'latency')
        .map(s => Number(s.value));
      
      const { mean: latMean, stdDev: latStd } = this.calculateStats(historicalLatencies);
      const recentLatAvg = recentScore.latencyMs;

      // Z-score = (recent - mean) / stdDev
      // We use a threshold of 2.0 (95% confidence anomaly)
      if (latStd > 0) {
        const zScore = (recentLatAvg - latMean) / latStd;
        if (zScore > 2.0) {
          patterns.push({
            type: 'LATENCY_DRIFT',
            severity: zScore > 5.0 ? 'critical' : 'warn',
            detail: `Average latency spike detected (Z-score: ${zScore.toFixed(2)}). Mean: ${Math.round(latMean)}ms.`,
            comparison: { recent: recentLatAvg, historical: latMean, zScore }
          });
        }
      } else if (recentLatAvg > latMean * 1.3 && latMean > 0) {
        // Fallback for zero variance: alert if latency increased by >30%
        patterns.push({
          type: 'LATENCY_DRIFT',
          severity: 'warn',
          detail: `Latency significantly increased from stable baseline (${Math.round(recentLatAvg)}ms vs ${Math.round(latMean)}ms)`,
          comparison: { recent: recentLatAvg, historical: latMean }
        });
      }

      // --- 3. Adaptive Token Spike Check (Z-score) ---
      const historicalTokens = historicalSignals
        .filter(s => s.type === 'token_usage')
        .map(s => Number(s.value));
      const { mean: tokenMean, stdDev: tokenStd } = this.calculateStats(historicalTokens);
      const recentTokenAvg = recentScore.tokenUsage / Math.max(1, recentScore.invocationCount);

      if (tokenStd > 0) {
        const zScore = (recentTokenAvg - tokenMean) / tokenStd;
        if (zScore > 2.0) {
          patterns.push({
            type: 'TOKEN_SPIKE',
            severity: 'warn',
            detail: `Token usage spike detected (Z-score: ${zScore.toFixed(2)}). Mean: ${Math.round(tokenMean)} tokens.`,
            comparison: { recent: recentTokenAvg, historical: tokenMean, zScore }
          });
        }
      }

      // 4. Default Stability Pattern
      if (patterns.length === 0) {
        patterns.push({
          type: 'STABLE',
          severity: 'info',
          detail: 'Performance remains within historical variance baselines.',
          comparison: { recent: recentScore.score, historical: historicalScore.score }
        });
      }

      return patterns;
    } catch (e) {
      console.error(`[PatternDetector] Analysis failed for ${assetId}:`, e);
      return [];
    }
  }

  /**
   * Calculates Mean and Standard Deviation for a set of numbers.
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }
}

export const patternDetector = new PatternDetector();
