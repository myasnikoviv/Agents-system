export type InfraBackend = 'sqlite' | 'postgres' | 'redis' | 'memory';
export interface RuntimeInfrastructureProfile {
    secretsBackend: InfraBackend;
    objectStorageBackend: InfraBackend;
    dispatchQueueBackend: InfraBackend;
    sharedWorkerStateBackend: InfraBackend;
    localOnlyMode: boolean;
}
export declare function resolveRuntimeInfrastructureProfile(env?: NodeJS.ProcessEnv): RuntimeInfrastructureProfile;
