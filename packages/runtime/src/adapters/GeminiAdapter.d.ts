import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
export declare class GeminiAdapter implements ExecutionAdapter {
    private apiKey;
    private modelName;
    private baseUrl;
    constructor(apiKey: string, modelName?: string);
    compilePayload(context: RunContext): any;
    execute(context: RunContext): Promise<ExecutionResult>;
}
