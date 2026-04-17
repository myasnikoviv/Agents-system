import type { ServiceExecutionAdapter } from './adapters/ServiceExecutionAdapter';
export type DockerServiceStatus = 'idle' | 'running' | 'stopped' | 'failed' | 'unknown';
export interface DockerServiceSpec {
    image: string;
    containerName?: string;
    env?: Record<string, string>;
    ports?: Array<{
        host: number;
        container: number;
    }>;
    command?: string[];
}
export interface DockerServiceRuntime {
    serviceId: string;
    containerName: string;
    containerId: string | null;
    image: string;
    status: DockerServiceStatus;
    health: string | null;
    lastUpdatedAt: string;
    [key: string]: unknown;
}
export interface DockerCommandResult {
    stdout: string;
    stderr: string;
    code: number;
}
type DockerCommandRunner = (args: string[]) => Promise<DockerCommandResult>;
export declare class DockerAdapter implements ServiceExecutionAdapter<DockerServiceSpec> {
    readonly adapterId = "docker";
    private readonly state;
    private readonly runner;
    constructor(runner?: DockerCommandRunner);
    getRuntime(serviceId: string): DockerServiceRuntime;
    start(serviceId: string, spec: DockerServiceSpec): Promise<DockerServiceRuntime>;
    stop(serviceId: string): Promise<DockerServiceRuntime>;
    restart(serviceId: string): Promise<DockerServiceRuntime>;
    readHealth(containerName: string): Promise<string>;
}
export {};
