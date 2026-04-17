import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { ExecutionPayload } from '../context/ExecutionPayloadCompiler';
export declare class LangChainAdapter implements ExecutionAdapter {
    private model;
    constructor(apiKey: string, modelName?: string);
    compilePayload(context: RunContext): ExecutionPayload;
    execute(context: RunContext): Promise<ExecutionResult>;
}
