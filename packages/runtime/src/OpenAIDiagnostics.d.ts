import OpenAI from 'openai';
export type OpenAIErrorCategory = 'insufficient_quota' | 'rate_limit' | 'auth' | 'network' | 'unknown';
export declare function classifyOpenAIError(error: any): OpenAIErrorCategory;
export declare function runOpenAIProbe(client: OpenAI): Promise<{
    ok: boolean;
    model: string;
    category?: OpenAIErrorCategory;
    message?: string;
}>;
