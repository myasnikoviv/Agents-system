import { RunContext } from './context/RunContext';
import { ExecutionAdapter, ExecutionResult } from './adapters/ExecutionAdapter';
export interface ToolResult {
    tool: string;
    status: 'success' | 'failed';
    content: any;
    summary: string;
    error?: string;
}
export interface ToolExecutionContext {
    runId: string;
    projectId: string;
    workspacePath: string;
}
export declare class NativeToolLoopRunner {
    private adapter;
    private maxIterations;
    constructor(adapter: ExecutionAdapter);
    private summarizeToolContent;
    run(context: RunContext): Promise<ExecutionResult>;
    private executeTool;
    private injectToolResults;
}
