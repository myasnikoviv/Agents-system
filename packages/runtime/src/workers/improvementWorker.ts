import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WorkerBus } from '../WorkerBus';

const QUEUE_KEY = 'events:improvement:agent_system';
const GROUP_NAME = 'improvement-workers';
const CONSUMER_NAME = `improvement-node-${uuidv4()}`;

async function mainWorkerLoop() {
  console.log(`[ImprovementWorker] Booting worker ${CONSUMER_NAME}`);
  const workerBus = new WorkerBus(QUEUE_KEY, GROUP_NAME, CONSUMER_NAME);
  await workerBus.ensureGroupExists();
  console.log(`[ImprovementWorker] Listening on queue: ${QUEUE_KEY}`);

  while (true) {
    try {
      const taskObj = await workerBus.awaitNextTask(5000);
      if (!taskObj) continue;

      const event = taskObj.event as any;
      const runId = String(event?.runId || 'unknown');
      const payload = event?.payload || {};
      const workspacePath = String(payload?.workspacePath || process.cwd());
      const reportDir = path.resolve(workspacePath, 'docs/process/runs/improvement-worker');
      fs.mkdirSync(reportDir, { recursive: true });

      const reportPath = path.join(reportDir, `${runId}.json`);
      fs.writeFileSync(
        reportPath,
        JSON.stringify(
          {
            runId,
            queueMessageId: taskObj.id,
            signalsPath: payload?.signalsPath || null,
            ticketsPath: payload?.ticketsPath || null,
            processedAt: new Date().toISOString(),
            status: 'processed',
          },
          null,
          2,
        ),
        'utf-8',
      );

      await workerBus.ackTask(taskObj.id);
      console.log(`[ImprovementWorker] Processed ${taskObj.id} for run ${runId}`);
    } catch (error) {
      console.error('[ImprovementWorker] Error:', error);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

if (require.main === module) {
  process.on('SIGINT', () => {
    console.log('\n[ImprovementWorker] Shutting down...');
    process.exit(0);
  });
  mainWorkerLoop().catch((err) => {
    console.error('[ImprovementWorker] Critical panic:', err);
    process.exit(1);
  });
}
