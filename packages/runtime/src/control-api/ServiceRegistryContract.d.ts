export type ServiceKind = 'api' | 'worker' | 'infra';
export type ServiceRuntime = 'node' | 'docker' | 'external';
export type DesiredServiceState = 'running' | 'stopped';
export type RestartPolicyMode = 'never' | 'on-failure' | 'always';
export interface ServiceRestartPolicy {
    mode?: RestartPolicyMode;
    maxRetries?: number;
    backoffMs?: number;
    [key: string]: unknown;
}
export interface DesiredServiceModel {
    state: DesiredServiceState;
    restartPolicy?: ServiceRestartPolicy;
    [key: string]: unknown;
}
export interface ServiceDescriptor {
    type: ServiceKind;
    runtime: ServiceRuntime;
    desired: DesiredServiceModel;
    entrypoint?: string;
    args?: string[];
    env?: Record<string, string>;
    health?: {
        protocol?: 'http' | 'heartbeat' | 'process' | 'none';
        endpoint?: string;
        intervalMs?: number;
        timeoutMs?: number;
        expectedStatus?: number;
        [key: string]: unknown;
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface ServiceRegistryDefinition {
    schemaVersion: 'service-registry.v1';
    services: Record<string, ServiceDescriptor>;
}
export declare function validateServiceRegistryDefinition(input: unknown): ServiceRegistryDefinition;
