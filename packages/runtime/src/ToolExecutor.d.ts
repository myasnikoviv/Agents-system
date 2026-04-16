import { RunContext } from './context/RunContext';
export declare class ToolExecutor {
    static execute(name: string, args: any, context: RunContext, meta?: {
        viaWorkbench?: boolean;
        isolatedWorkspacePath?: string;
    }): Promise<any>;
}
