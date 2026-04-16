"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UnifiedSwarmGraph_1 = require("../graphs/UnifiedSwarmGraph");
async function testRealReasoning() {
    console.log("--- E2E: Real Agent Reasoning Test ---");
    if (!process.env.OPENAI_API_KEY) {
        console.warn("SKIP: OPENAI_API_KEY not found. Running with mocks.");
    }
    const threadId = `test-real-${Date.now()}`;
    const issueId = "TKT-REAL-TEST-001";
    try {
        const finalState = await (0, UnifiedSwarmGraph_1.executeUnifiedSwarmRun)({
            ticketId: issueId,
            runId: `run-${Date.now()}`,
            threadId,
            status: 'initialized',
            artifactLogs: [],
            executionOptions: { mode: 'multiple_agents' },
            messages: [{ role: 'user', content: 'hello' }],
        });
        console.log("\n--- Final Artifact Logs ---");
        finalState.artifactLogs.forEach((log, i) => {
            console.log(`[${i}] ${log.substring(0, 200)}...`);
        });
        if (finalState.status === 'architecture_completed') {
            console.log("\nGraph Execution: SUCCESS");
        }
        else {
            console.error("\nGraph Execution: FAILED (status mismatch)");
            process.exit(1);
        }
    }
    catch (err) {
        console.error("\nGraph Execution: ERROR", err);
        process.exit(1);
    }
}
testRealReasoning();
