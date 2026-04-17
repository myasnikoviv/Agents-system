import { RunContext } from './context/RunContext';
export interface WorkbenchExecutionResult {
    status: 'success' | 'failed' | 'queued' | 'blocked';
    content: any;
    summary: string;
    queuePosition?: number;
    error?: string;
}
export declare function executeViaWorkbench(toolId: string, args: any, context: RunContext): Promise<WorkbenchExecutionResult>;
