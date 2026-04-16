export interface WorkbenchTelemetryEntry {
    ts: string;
    runId: string;
    projectId: string;
    agentId: string;
    toolId: string;
    action: 'request' | 'acquired' | 'queued' | 'blocked' | 'executed' | 'released' | 'failed';
    status: 'success' | 'failed';
    startedAt?: string;
    endedAt?: string;
    durationMs?: number;
    detail?: string;
}
export declare function appendWorkbenchTelemetry(entry: Omit<WorkbenchTelemetryEntry, 'ts'>): WorkbenchTelemetryEntry;
