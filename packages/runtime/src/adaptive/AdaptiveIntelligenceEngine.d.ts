import { ModelTier, ModelRouteDecision } from '@system/shared';
export { ModelTier, ModelRouteDecision };
export interface LearningSignals {
    runId: string;
    projectId: string;
    tokens: number;
    retries: number;
    loops: number;
    complianceFailures: number;
}
export interface AdaptivePolicy {
    retryLimit: number;
    enableImprovementLoop: boolean;
    preferredTier: ModelTier;
    reason: string;
}
export declare function applyCostAwareTierPolicy(input: {
    workspacePath: string;
    planName?: string;
    decision: ModelRouteDecision;
}): ModelRouteDecision;
export declare function applyRoutingPolicies(input: {
    workspacePath: string;
    decision: ModelRouteDecision;
    mode?: 'cost_saver' | 'balanced' | 'quality_first';
    governanceSignal?: 'normal' | 'caution' | 'constrained';
}): ModelRouteDecision;
export declare function routeModelForTask(input: {
    workspacePath: string;
    runId: string;
    projectId: string;
    userMessage: string;
}): ModelRouteDecision;
export declare function collectLearningSignals(workspacePath: string, runId: string, projectId: string): LearningSignals;
export declare function decideAdaptivePolicy(signals: LearningSignals): AdaptivePolicy;
export declare function enforceBoundedAdaptation(previous: AdaptivePolicy | null, next: AdaptivePolicy, maxRetryDelta?: number): AdaptivePolicy;
export declare function applyPerformanceAwarePolicy(input: {
    workspacePath: string;
    projectId: string;
    assetId: string;
    decision: ModelRouteDecision;
    mode?: 'cost_saver' | 'balanced' | 'quality_first';
}): Promise<ModelRouteDecision>;
export declare function getAggregatedContext(projectId: string, assetId: string): Promise<any>;
export declare function writeAdaptiveLog(workspacePath: string, payload: {
    runId: string;
    projectId: string;
    route: ModelRouteDecision;
    policy: AdaptivePolicy;
    signals?: LearningSignals;
}): string;
