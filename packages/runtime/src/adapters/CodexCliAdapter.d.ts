import { ExecutionAdapter, ExecutionResult } from './ExecutionAdapter';
import { RunContext } from '../context/RunContext';
import { ExecutionPayload } from '../context/ExecutionPayloadCompiler';
export declare class CodexCliAdapter implements ExecutionAdapter {
    private parseCodexJsonOutput;
    compilePayload(context: RunContext): ExecutionPayload;
    execute(context: RunContext): Promise<ExecutionResult>;
}
