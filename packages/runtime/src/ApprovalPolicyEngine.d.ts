import { RunContext } from './context/RunContext';
export type ApprovalMode = 'interrupt_before' | 'interrupt_after';
export interface ApprovalPolicy {
    id: string;
    mode: ApprovalMode;
    nodes: string[];
    condition: string;
    description: string;
}
export interface ApprovalConfig {
    version: string;
    policies: ApprovalPolicy[];
    default_mode: string;
}
export declare class ApprovalPolicyEngine {
    private static instance;
    private config;
    private configPath;
    private constructor();
    static getInstance(): ApprovalPolicyEngine;
    private loadConfig;
    /**
     * Evaluates if a node should be interrupted based on the active policies.
     */
    shouldInterrupt(nodeName: string, context: RunContext, mode: ApprovalMode): boolean;
    private evaluateCondition;
    /**
     * Helper to resolve the mode (mostly for back compat or global overrides)
     */
    getGlobalMode(): string;
    /**
     * Returns a list of nodes that should ALWAYS be interrupted before (static).
     * This is used for backward compatibility with the graph's compile() config.
     */
    getStaticInterruptBeforeNodes(): string[];
}
/**
 * Backward compatibility export for the unified swarm graph.
 */
export declare function resolveInterruptBeforeNodes(): string[];
