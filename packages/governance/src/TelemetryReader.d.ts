export interface TelemetrySnapshot {
    totalTokens: number;
    entries: number;
    hasSkillTelemetry: boolean;
}
export interface LoopPressureSnapshot {
    retries: number;
    governanceChecks: number;
}
export declare function readTelemetry(workspacePath: string, runId: string): TelemetrySnapshot;
export declare function readLoopPressure(workspacePath: string, runId: string): LoopPressureSnapshot;
