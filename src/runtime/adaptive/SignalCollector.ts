import { getRedisClient } from '../redisClient';

/**
 * Sprint 35B — Self-Improvement Signals
 * High-performance collector for runtime telemetry.
 */

export interface RuntimeSignal {
  type: 'latency' | 'token_usage' | 'failure' | 'retry';
  assetId: string;
  projectId: string;
  value: number | string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class SignalCollector {
  private static instance: SignalCollector;
  private redis = getRedisClient();
  private bufferSize = 10; // Small buffer for initial implementation
  private buffer: RuntimeSignal[] = [];

  private constructor() {}

  static getInstance(): SignalCollector {
    if (!this.instance) {
      this.instance = new SignalCollector();
    }
    return this.instance;
  }

  /**
   * Emits a signal into the collector.
   */
  async emit(signal: Omit<RuntimeSignal, 'timestamp'>): Promise<void> {
    const fullSignal: RuntimeSignal = {
      ...signal,
      timestamp: new Date().toISOString()
    };

    this.buffer.push(fullSignal);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Flushes the buffer to Redis.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const signals = [...this.buffer];
    this.buffer = [];

    try {
      const pipeline = this.redis.multi();
      for (const signal of signals) {
        // Sharded key by project and asset
        const key = `signals:${signal.projectId}:${signal.assetId}`;
        pipeline.lpush(key, JSON.stringify(signal));
        // Retention policy: keep last 500 signals per asset
        pipeline.ltrim(key, 0, 499);
      }

      await pipeline.exec();
    } catch (e) {
      console.error('[SignalCollector] Failed to flush signals:', e);
      // Re-add to buffer if flush fails? 
      // For now, we prefer dropping signals over memory leaks.
    }
  }
}

export const signalCollector = SignalCollector.getInstance();
