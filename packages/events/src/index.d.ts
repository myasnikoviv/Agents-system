import { RuntimeEvent, RuntimeEventType } from '@system/shared';
/**
 * @system/events
 * Decoupled Event Bus Core.
 */
export type EventSubscriber = (event: RuntimeEvent) => Promise<void> | void;
export interface EventBusOptions {
    redisClient?: any;
    streamKey?: string;
}
export declare class EventBusCore {
    private subscribers;
    private redis;
    private streamKey;
    constructor(options?: EventBusOptions);
    /**
     * Register a persistent side-effect (e.g., Billing, Ledger) as a subscriber.
     */
    subscribe(handler: EventSubscriber): () => void;
    /**
     * Emit an event to the global stream and notify all subscribers.
     */
    emit(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): Promise<string>;
}
export * from './types';
export * from './EventValidation';
export * from './EventStore';
export declare const globalEventBus: EventBusCore;
/**
 * Legacy compatibility helper: emitEvent
 */
export declare const emitEvent: (event: Omit<RuntimeEvent, "id" | "timestamp">) => Promise<string>;
/**
 * Legacy compatibility helper: emitSwarmEvent
 */
export declare const emitSwarmEvent: (type: RuntimeEventType, context: any, // context is passed as any to avoid circularity with runtime
payload?: Record<string, any>) => Promise<string>;
/**
 * Legacy compatibility helper: emitGuardBlockEvent
 */
export declare const emitGuardBlockEvent: (context: {
    runId: string;
    projectId: string;
    chainId: string;
}, payload: Record<string, any>) => Promise<string>;
/**
 * Utility to fetch recent events.
 * Note: This requires redis client to be injected into globalEventBus.
 */
export declare const fetchRecentEvents: (count?: number) => Promise<RuntimeEvent[]>;
/**
 * Utility to fetch events for a run.
 */
export declare const fetchEventsByRunId: (input: {
    runId: string;
    projectId?: string;
}) => Promise<RuntimeEvent[]>;
