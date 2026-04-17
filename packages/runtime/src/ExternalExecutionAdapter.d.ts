export type ExternalExecutorId = 'claude-code' | 'codex-cli' | 'openhands-sdk';
export interface ExternalExecutionInput {
    executor: ExternalExecutorId;
    prompt: string;
    runId?: string;
    cwd?: string;
    timeoutMs?: number;
    model?: string;
    binaryPath?: string;
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
}
export interface ExternalExecutionResult {
    ok: boolean;
    executor: ExternalExecutorId;
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    command: string[];
}
export declare function runExternalExecutor(input: ExternalExecutionInput): Promise<ExternalExecutionResult>;
