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
export declare class PatternDetector {
    private redis;
    /**
     * Analyzes the signal history for an asset to detect patterns/trends.
     * Uses statistical Z-scores for adaptive thresholding.
     */
    detectPatterns(projectId: string, assetId: string): Promise<DetectedPattern[]>;
    /**
     * Calculates Mean and Standard Deviation for a set of numbers.
     */
    private calculateStats;
}
export declare const patternDetector: PatternDetector;
