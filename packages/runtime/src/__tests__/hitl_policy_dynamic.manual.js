"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RuntimeExecutionRouter_1 = require("../graphs/RuntimeExecutionRouter");
const langgraph_1 = require("@langchain/langgraph");
async function testDynamicHITL() {
    console.log('--- HITL Dynamic Policy Verification ---');
    const runId = `test-hitl-${Date.now()}`;
    const threadId = `thread-${Date.now()}`;
    // 1. Force a policy match: git-flow-manager should always interrupt
    // We use the real ApprovalPolicyEngine which loads from docs/runtime/governance/approval-policy.yaml
    const userInput = 'Please merge feature/x to main';
    console.log(`Starting run ${runId} with input: "${userInput}"`);
    // We need a memory saver to persist state between interrupts
    const checkpointer = new langgraph_1.MemorySaver();
    // Note: executeRuntimeRun usually creates the graph, we might want to call it twice
    // once to start and hit the interrupt, second to resume.
    try {
        console.log('\n[Phase 1] Executing until interrupt...');
        const result1 = await (0, RuntimeExecutionRouter_1.executeRuntimeRun)({
            runId: runId,
            threadId: threadId,
            projectId: 'test-project',
            workspacePath: process.cwd(),
            messages: [{ role: 'user', content: userInput }],
            selected_pipeline: 'unified-task-intake',
            preferredLanguage: 'en',
            artifactLogs: [userInput]
        });
        console.log('Result 1 (Expected to be partial/interrupted):', JSON.stringify(result1, null, 2));
        if (result1.finalState.__interrupt__) {
            console.log('\n[Phase 2] Resuming after approval...');
            const result2 = await (0, RuntimeExecutionRouter_1.resumeRuntimeRun)(threadId, 'approved');
            console.log('Result 2 (Expected to complete or next interrupt):', JSON.stringify(result2, null, 2));
        }
    }
    catch (error) {
        if (error.name === 'GraphInterrupt' || error.message?.includes('interrupt')) {
            console.log('SUCCESS: Graph interrupted as expected.');
        }
        else {
            console.error('FAILED: Unexpected error during execution:', error);
        }
    }
    // To truly verify resumption, we'd need to call the graph again with the same threadId and checkpointer.
    // The executeRuntimeRun currently doesn't expose the underlying graph/checkpointer easily for external resumption in a single call.
    // But we can check the RunLedger/EventBus for the 'agent.waiting_for_approval' event.
}
testDynamicHITL().catch(console.error);
