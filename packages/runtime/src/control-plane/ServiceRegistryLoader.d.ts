import { ServiceRegistryDefinition } from './ServiceRegistryContract';
export interface ServiceRegistryLoadResult {
    sourcePath: string;
    loadedAt: string;
    registry: ServiceRegistryDefinition;
}
export interface ServiceRegistryWatchHandle {
    close: () => void;
}
export declare function loadServiceRegistry(sourcePath: string): ServiceRegistryLoadResult;
export declare function watchServiceRegistry(sourcePath: string, onReload: (result: ServiceRegistryLoadResult) => void, onError?: (error: Error) => void): ServiceRegistryWatchHandle;
