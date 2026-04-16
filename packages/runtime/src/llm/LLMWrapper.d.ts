export interface LLMCallOptions {
    runId: string;
    projectId: string;
    chainId: string;
    model: string;
    provider: string;
    source: 'agent' | 'guard' | 'retry' | 'system';
}
export declare function wrapLLMCall<T>(options: LLMCallOptions, prompt: string, callFn: (prompt: string) => Promise<{
    response: string;
    tokensInput: number;
    tokensOutput: number;
}>): Promise<string>;
