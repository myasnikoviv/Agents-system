import { WorkerBus } from '../WorkerBus';
import { emitEvent, RuntimeEvent } from '../events/EventBus';
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = 'events:worker:research';
const GROUP_NAME = 'research-workers';
const CONSUMER_NAME = `researcher-node-${uuidv4()}`;

async function mainWorkerLoop() {
  console.log(`[ResearchWorker] Booting isolated worker ${CONSUMER_NAME}`);
  
  const workerBus = new WorkerBus(QUEUE_KEY, GROUP_NAME, CONSUMER_NAME);
  await workerBus.ensureGroupExists();

  console.log(`[ResearchWorker] Listening on queue: ${QUEUE_KEY}`);

  while (true) {
    try {
      const taskObj = await workerBus.awaitNextTask(5000); // block for 5 second polling

      if (!taskObj) {
        continue;
      }

      console.log(`\n[ResearchWorker] -> Received Job ${taskObj.id} for Run: ${taskObj.event.pipeline_run_id}`);
      
      const event: RuntimeEvent = taskObj.event;

      // Simulate heavy AI work / LLM processing
      console.log(`[ResearchWorker] Processing issue: ${event.plane_issue_id}...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`[ResearchWorker] Analysis complete. Returning results to central Hub.`);

      // Push completion event to main Orchestrator runtime hub
      await emitEvent({
        event_type: 'research.completed',
        plane_issue_id: event.plane_issue_id,
        pipeline_run_id: event.pipeline_run_id,
        thread_id: event.thread_id,
        agent_role: 'Research Agent',
        source_stage: 'research',
        target_stage: 'planning',
        status: 'success',
        correlation_id: event.plane_issue_id,
        causation_id: taskObj.id,
        payload: {
          findings: ['Discovered standard alternative approaches in Memory.', 'Built context envelope for Architect.']
        }
      });

      // Acknowledge consuming this work unit from the group
      await workerBus.ackTask(taskObj.id);

    } catch (error) {
       console.error(`[ResearchWorker] Fault in processing loop:`, error);
       // Wait before retrying
       await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

if (require.main === module) {
  process.on('SIGINT', () => {
    console.log('\n[ResearchWorker] Shutting down cleanly...');
    process.exit(0);
  });

  mainWorkerLoop().catch(err => {
    console.error("[ResearchWorker] Critical Panic:", err);
    process.exit(1);
  });
}
