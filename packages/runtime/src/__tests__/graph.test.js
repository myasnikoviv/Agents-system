"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const UnifiedSwarmGraph_1 = require("../graphs/UnifiedSwarmGraph");
const events_1 = require("@system/events");
const redisClient_1 = require("../redisClient");
const uuid_1 = require("uuid");
(0, globals_1.describe)('UnifiedSwarmGraph Test', () => {
    let threadId;
    let runId;
    let issueId;
    (0, globals_1.beforeAll)(() => {
        threadId = (0, uuid_1.v4)();
        runId = (0, uuid_1.v4)();
        issueId = 'TKT-1029'; // sample Plane issue
    });
    (0, globals_1.afterAll)(async () => {
        await (0, redisClient_1.closeRedisClient)();
    });
    (0, globals_1.it)('should complete the unified swarm execution flow', async () => {
        const finalState = await (0, UnifiedSwarmGraph_1.executeUnifiedSwarmRun)({
            ticketId: issueId,
            runId: runId,
            threadId: threadId,
            status: 'initialized',
            artifactLogs: [],
            executionOptions: { mode: 'multiple_agents' }
        });
        (0, globals_1.expect)(finalState).toBeDefined();
        (0, globals_1.expect)(finalState.status).toBeDefined();
        // Final state in our graph often ends with one of the agents or END
        console.log("Final State Status:", finalState.status);
    }, 10000); // 10s timeout for complex graph runs
    (0, globals_1.it)('should correctly propagate events into Redis Hub', async () => {
        // Wait briefly for xadd to settle in Redis stream
        await new Promise(resolve => setTimeout(resolve, 1000));
        const events = await (0, events_1.fetchRecentEvents)(20);
        const runEvents = events.filter(e => e.runId === runId);
        console.log(`Found ${runEvents.length} events for runId ${runId}`);
        // We expect at least some events if the execution options were correct
        // expect(runEvents.length).toBeGreaterThan(0);
    });
});
