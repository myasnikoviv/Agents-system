import { RuntimeSignal } from './SignalCollector';
import { AgentPerformanceScore } from '../performance/AgentPerformanceScoring';
/**
 * Sprint 35B — Self-Improvement Signals
 * Aggregates raw telemetry events into structured dataset for pattern detection.
 */
export declare class SignalAggregator {
    private redis;
    /**
     * Aggregates raw signals for a given asset/project from Redis.
     * Returns a performance score which can be used to trigger adaptive policies.
     */
    aggregateSignals(projectId: string, assetId: string): Promise<AgentPerformanceScore | null>;
    /**
     * Aggregates a given slice of signals into a performance score.
     */
    aggregateSlice(assetId: string, signals: RuntimeSignal[]): AgentPerformanceScore;
    /**
     * Helper to fetch aggregated stats for multiple assets in a project.
     */
    aggregateProject(projectId: string, assetIds: string[]): Promise<Record<string, AgentPerformanceScore>>;
}
export declare const signalAggregator: SignalAggregator;
