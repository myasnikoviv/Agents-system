import { executeQuasiLinearRun } from '../graphs/PilotQuasiLinearGraph';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../redisClient';
import { emitEvent } from '../events/EventBus';

/**
 * Phase 5 QA Node: Verify distributed execution handoff
 */
async function runDistributedTest() {
  console.log("--- Starting Phase 5 Distributed Worker Test ---");

  const runId = uuidv4();
  const threadId = uuidv4();
  const mockIssueId = `TKT-TEST-${Math.floor(Math.random() * 1000)}`;

  // We will run the graph in the background
  console.log(`[Test] Kicking off graph execution. It should block at researchNode...`);
  const graphPromise = executeQuasiLinearRun({
    plane_issue_id: mockIssueId,
    pipeline_run_id: runId,
    thread_id: threadId,
    status: 'initialized',
    artifactLogs: ['Test Setup']
  });

  // Wait a few seconds to let LangGraph hit the research node and pause
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const redis = getRedisClient();
  
  // 1. Verify that the task was emitted to the worker queue
  console.log(`[Test] Verifying worker queue holds the task...`);
  const queueItems = await redis.xrange('events:worker:research', '-', '+');
  let taskFound = false;

  for (const item of queueItems) {
      try {
          const payloadIdx = item[1].indexOf('data') + 1;
          const payloadStr = item[1][payloadIdx];
          if (!payloadStr) continue;
          
          const ev = JSON.parse(payloadStr);
          if (ev.pipeline_run_id === runId && ev.event_type === 'task.research.assigned') {
              taskFound = true;
              console.log(`[Test] ✅ Verified worker payload emitted to queue.`);
              break;
          }
      } catch (e) {}
  }

  if (!taskFound) {
      console.error(`[Test] ❌ Failed to find task assigned event in queue.`);
      process.exit(1);
  }

  // 2. Simulate worker finishing its job and dropping the completion event on the hub
  console.log(`[Test] Simulating external worker completion...`);
  await emitEvent({
        event_type: 'research.completed',
        plane_issue_id: mockIssueId,
        pipeline_run_id: runId,
        thread_id: threadId,
        agent_role: 'Research Agent',
        source_stage: 'research',
        target_stage: 'planning',
        status: 'success',
        correlation_id: mockIssueId,
        payload: {
          findings: ['Mocked External QA completion finding.']
        }
  });

  // 3. Wait for Graph to resume and finish
  console.log(`[Test] Waiting for graph to resume and complete...`);
  const finalState = await graphPromise;

  console.log(`\nFinal State Received:`);
  console.log(JSON.stringify(finalState, null, 2));

  if (finalState.status === 'architecture_completed' && finalState.artifactLogs?.includes('Mocked External QA completion finding.')) {
      console.log(`[Test] ✅ Phase 5 Distributed Handoff successful.`);
      process.exit(0);
  } else {
      console.error(`[Test] ❌ Graph did not complete correctly.`);
      process.exit(1);
  }
}

if (require.main === module) {
  runDistributedTest().catch(console.error);
}
