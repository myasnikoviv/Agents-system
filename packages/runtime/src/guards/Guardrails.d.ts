export declare class Guardrails {
    private static llmCallCounts;
    private static startTimeMap;
    private static retryCounts;
    static readonly MAX_TOTAL_LLM_CALLS = 120;
    static readonly MAX_RUN_TIME_MS = 600000;
    static readonly MAX_RETRIES_PER_STEP = 2;
    static getMaxRetriesPerStep(): number;
    static getMaxRunTimeMs(): number;
    static getMaxTotalLlmCalls(): number;
    static recordLLMCall(runId: string): void;
    static checkTimeLimit(runId: string): void;
    static incrementRetry(runId: string, stepId: string): number;
    static clear(runId: string): void;
}
