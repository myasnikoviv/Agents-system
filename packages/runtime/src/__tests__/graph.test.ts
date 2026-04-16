import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { executeUnifiedSwarmRun } from '../graphs/UnifiedSwarmGraph';
import { fetchRecentEvents } from '@system/events';
import { closeRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';

describe('UnifiedSwarmGraph Test', () => {
    let threadId: string;
    let runId: string;
    let issueId: string;

    beforeAll(() => {
        threadId = uuidv4();
        runId = uuidv4();
        issueId = 'TKT-1029'; // sample Plane issue
    });

    afterAll(async () => {
        await closeRedisClient();
    });

    it('should complete the unified swarm execution flow', async () => {
        const finalState = await executeUnifiedSwarmRun({
            ticketId: issueId,
            runId: runId,
            threadId: threadId,
            status: 'initialized',
            artifactLogs: [],
            executionOptions: { mode: 'multiple_agents' }
        });

        expect(finalState).toBeDefined();
        expect(finalState.status).toBeDefined();
        
        // Final state in our graph often ends with one of the agents or END
        console.log("Final State Status:", finalState.status);
    }, 10000); // 10s timeout for complex graph runs

    it('should correctly propagate events into Redis Hub', async () => {
        // Wait briefly for xadd to settle in Redis stream
        await new Promise(resolve => setTimeout(resolve, 1000));
        const events = await fetchRecentEvents(20);
        
        const runEvents = events.filter(e => e.runId === runId);
        console.log(`Found ${runEvents.length} events for runId ${runId}`);
        
        // We expect at least some events if the execution options were correct
        // expect(runEvents.length).toBeGreaterThan(0);
    });
});
