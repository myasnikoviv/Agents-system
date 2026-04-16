/**
 * IntakeClassifier — LLM-based request router for the Cockpit agent system.
 *
 * Analyzes incoming user messages and returns structured routing intent.
 * Supports:
 * - Conversational Q&A
 * - Standard pipelines (new-feature, bug-fix, refactor, etc.)
 * - Custom agent composition (e.g. "Use only the Developer and QA agents")
 * - Meta-language directives (e.g. "pipeline: bug-fix", "agent: developer, qa")
 */
export type IntentType = 'conversational' | 'new-feature' | 'bug-fix' | 'refactor' | 'research' | 'strategy-tuning' | 'design-audit' | 'custom' | 'unknown';
export interface ClassificationResult {
    intent: IntentType;
    pipeline: string;
    /** For 'custom' intent: ordered list of agent slugs to run */
    customAgents: string[];
    confidence: number;
    reason: string;
    /** Whether the user explicitly specified a pipeline/agent in the message */
    isExplicit: boolean;
}
/**
 * Returns only explicit user directives (pipeline/agent) without running
 * heuristic or LLM intent classification.
 */
export declare function resolveExplicitDirectives(message: string): ClassificationResult | null;
/**
 * Main entry point: classify a user message.
 *
 * Priority:
 * 1. Explicit meta-language directives (pipeline: X, agent: Y)
 * 2. Fast rule-based classification
 * 3. LLM-based classification (if rules don't match)
 */
export declare function classifyRequest(message: string): Promise<ClassificationResult>;
