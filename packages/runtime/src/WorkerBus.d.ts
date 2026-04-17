import { RuntimeEvent } from '@system/events';
export declare class WorkerBus {
    private queueKey;
    private groupName;
    private consumerName;
    constructor(queueKey: string, groupName: string, consumerName: string);
    /**
     * Ensure the consumer group exists before attempting to read.
     */
    ensureGroupExists(): Promise<void>;
    /**
     * Block and listen for new events on the stream.
     * Uses XREADGROUP for consumer tracking.
     */
    awaitNextTask(blockMs?: number): Promise<{
        id: string;
        event: RuntimeEvent;
    } | null>;
    /**
     * Acknowledge the task is completed so it drops from pending list.
     */
    ackTask(messageId: string): Promise<void>;
}
