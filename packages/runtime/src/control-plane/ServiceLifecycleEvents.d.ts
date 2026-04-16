export type ServiceLifecycleEventKind = 'service.started' | 'service.failed' | 'service.restarted' | 'service.degraded' | 'service.stopped';
export interface ServiceLifecycleEvent {
    kind: ServiceLifecycleEventKind;
    serviceId: string;
    reason: string | null;
    timestamp: string;
    source: string;
    actorId: string | null;
}
export declare class ServiceLifecycleEventBus {
    private readonly events;
    private readonly storagePath;
    constructor(storagePath?: string);
    emit(kind: ServiceLifecycleEventKind, serviceId: string, reason?: string | null, metadata?: {
        source?: string;
        actorId?: string | null;
    }): ServiceLifecycleEvent;
    list(): ServiceLifecycleEvent[];
    private persist;
    private restore;
}
