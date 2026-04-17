export interface RunCostMetrics {
    runId: string;
    projectId: string;
    tokens: number;
    toolExecutions: number;
    runtimeSeconds: number;
    loops: number;
    retries: number;
    attribution: {
        byAgent: Record<string, number>;
        byStep: Record<string, number>;
    };
    breakdown: {
        execution: number;
        governance: number;
        compliance: number;
        other: number;
    };
    monetary: {
        currency: string;
        rates: {
            per1kTokensUsd: number;
            perToolExecutionUsd: number;
            perRuntimeSecondUsd: number;
        };
        tokenCostUsd: number;
        toolCostUsd: number;
        runtimeCostUsd: number;
        totalCostUsd: number;
        byAgentUsd: Record<string, number>;
        byStepUsd: Record<string, number>;
        breakdownUsd: {
            execution: number;
            governance: number;
            compliance: number;
            other: number;
        };
    };
}
export interface CostAggregationResult {
    runs: number;
    totals: {
        tokens: number;
        toolExecutions: number;
        runtimeSeconds: number;
        totalCostUsd: number;
    };
    byProject: Record<string, {
        runs: number;
        tokens: number;
        toolExecutions: number;
        runtimeSeconds: number;
        totalCostUsd: number;
    }>;
}
export declare function collectRunCostMetrics(workspacePath: string, runId: string, projectId: string): RunCostMetrics;
export declare function enforceHardCostLimit(metrics: RunCostMetrics, workspacePath: string): {
    allowed: boolean;
    threshold: number;
};
export declare function enforceBudgetConstraints(metrics: RunCostMetrics, workspacePath: string): {
    allowed: boolean;
    softExceeded: boolean;
    softThresholdUsd: number;
    hardThresholdUsd: number;
    reason: string;
};
export declare function writeCostLedger(metrics: RunCostMetrics, workspacePath: string): string;
export declare function decideAdaptiveOptimization(workspacePath: string, projectId: string): {
    lowRisk: boolean;
    suggestedMaxRetriesPerStep: number;
};
export declare function aggregateCostLedgers(workspacePath: string, filter?: {
    projectId?: string;
}): CostAggregationResult;
