import type { ServiceExecutionAdapter } from './adapters/ServiceExecutionAdapter';
export type LocalServiceStatus = 'idle' | 'running' | 'stopped' | 'crashed';
export interface LocalProcessServiceSpec {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    logDir?: string;
}
export interface LocalProcessRuntime {
    serviceId: string;
    pid: number | null;
    status: LocalServiceStatus;
    startedAt: string | null;
    stoppedAt: string | null;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    crashReason: string | null;
    [key: string]: unknown;
}
export declare class LocalProcessAdapter implements ServiceExecutionAdapter<LocalProcessServiceSpec> {
    readonly adapterId = "local-process";
    private readonly services;
    getRuntime(serviceId: string): LocalProcessRuntime;
    isRunning(serviceId: string): boolean;
    start(serviceId: string, spec: LocalProcessServiceSpec): Promise<LocalProcessRuntime>;
    stop(serviceId: string, options?: {
        signal?: NodeJS.Signals;
        timeoutMs?: number;
    }): Promise<LocalProcessRuntime>;
    restart(serviceId: string, specOverride?: Partial<LocalProcessServiceSpec>): Promise<LocalProcessRuntime>;
    private waitForExit;
    private createLogStream;
}
