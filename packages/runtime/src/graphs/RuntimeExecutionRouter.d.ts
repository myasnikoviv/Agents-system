import { type PilotState } from './UnifiedSwarmGraph';
export type RuntimeExecutionMode = 'linear' | 'multiple_agents';
export interface RuntimeExecutionResult {
    finalState: any;
    modeRequested: RuntimeExecutionMode;
    modeApplied: RuntimeExecutionMode;
    engine: 'pilot-unified-graph' | 'pilot-multiple-agents-runtime';
}
/**
 * Runtime execution dispatcher with Governance Gates integrated (Sprint 5.5).
 */
export declare function executeRuntimeRun(initialState: Partial<PilotState>): Promise<RuntimeExecutionResult>;
export declare function resumeRuntimeRun(threadId: string, decision: any): Promise<RuntimeExecutionResult>;
