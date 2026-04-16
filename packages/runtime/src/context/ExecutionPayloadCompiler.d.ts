import { RunContext } from './RunContext';
export interface ExecutionPayload {
    runId: string;
    projectId: string;
    workspacePath: string;
    systemPrompt: string;
    userPrompt: string;
    task: {
        goal: string;
        type: string;
    };
    context: {
        role: string;
        pipeline: string;
        stage: string;
    };
    tools: Array<{
        name: string;
        description: string;
        schema?: any;
    }>;
    memory: {
        facts: Record<string, any>;
        decisions: Record<string, any>;
        threadHistory: Array<{
            role: 'user' | 'assistant' | 'observation';
            content: string;
            tool_call_id?: string;
        }>;
    };
    outputContract: any;
    guardrails: any;
}
export declare class ExecutionPayloadCompiler {
    /**
     * Compiles the canonical RunContext into a provider-agnostic structured payload.
     * This ensures all adapters receive identical, high-fidelity information.
     */
    static compile(context: RunContext): ExecutionPayload;
}
