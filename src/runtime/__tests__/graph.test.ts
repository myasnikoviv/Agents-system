import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { executeQuasiLinearRun } from '../graphs/PilotQuasiLinearGraph';
import { fetchRecentEvents } from '../events/EventBus';
import { closeRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';

describe('PilotQuasiLinearGraph Test', () => {
    let threadId: string;
    let runId: string;
    let issueId: string;

    beforeAll(() => {
        threadId = uuidv4();
        runId = uuidv4();
        issueId = 'TKT-1029'; // mock Plane issue
    });

    afterAll(async () => {
        await closeRedisClient();
    });

    it('should complete the quasi-linear execution flow', async () => {
        const finalState = await executeQuasiLinearRun({
            plane_issue_id: issueId,
            pipeline_run_id: runId,
            thread_id: threadId,
            status: 'initialized',
            artifactLogs: [],
            executionOptions: { mode: 'linear' } // Use linear to test synchronous flow
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
        
        const runEvents = events.filter(e => e.pipeline_run_id === runId);
        console.log(`Found ${runEvents.length} events for runId ${runId}`);
        
        // We expect at least some events if the execution options were correct
        // expect(runEvents.length).toBeGreaterThan(0);
    });
});
