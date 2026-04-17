export type RetryErrorClass = 'transient' | 'rate_limited' | 'timeout' | 'quota' | 'auth' | 'validation' | 'unknown';
export declare function classifyRetryError(errorText: string): RetryErrorClass;
export declare function shouldSmartRetry(input: {
    workspacePath: string;
    errorText: string;
    estimatedTokens: number;
}): {
    retry: boolean;
    errorClass: RetryErrorClass;
    reason: string;
};
