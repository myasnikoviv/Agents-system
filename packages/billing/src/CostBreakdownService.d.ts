export interface CostBreakdownFilter {
    runId?: string;
    projectId?: string;
    workspaceId?: string;
    limit?: number;
}
export interface CostBreakdownResult {
    perRun: Array<{
        runId: string;
        projectId: string;
        workspaceId: string;
        totalCostUsd: number;
        tokens: number;
        toolExecutions: number;
        runtimeSeconds: number;
    }>;
    perAgent: Record<string, number>;
    perWorkspace: Record<string, number>;
}
export declare class CostBreakdownService {
    aggregate(workspacePath: string, filter?: CostBreakdownFilter): CostBreakdownResult;
}
