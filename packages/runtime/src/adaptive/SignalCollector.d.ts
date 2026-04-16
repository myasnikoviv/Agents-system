/**
 * Sprint 35B — Self-Improvement Signals
 * High-performance collector for runtime telemetry.
 */
export interface RuntimeSignal {
    type: 'latency' | 'token_usage' | 'failure' | 'retry';
    assetId: string;
    projectId: string;
    value: number | string;
    timestamp: string;
    metadata?: Record<string, any>;
}
export declare class SignalCollector {
    private static instance;
    private redis;
    private bufferSize;
    private buffer;
    private constructor();
    static getInstance(): SignalCollector;
    /**
     * Emits a signal into the collector.
     */
    emit(signal: Omit<RuntimeSignal, 'timestamp'>): Promise<void>;
    /**
     * Flushes the buffer to Redis.
     */
    flush(): Promise<void>;
}
export declare const signalCollector: SignalCollector;
