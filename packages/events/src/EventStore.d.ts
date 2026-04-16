import { RuntimeEvent } from './types';
export declare class EventStore {
    /**
     * Fetches all events for a specific run.
     */
    static getEventsByRunId(runId: string): Promise<RuntimeEvent[]>;
    /**
     * Fetches the filtered chat view (agent.message events) for a thread.
     * This implements the 'Chat is a filtered view' requirement.
     */
    static getChatMessages(runIds: string[]): Promise<any[]>;
}
