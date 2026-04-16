import { ProjectDispatchQueue } from '@system/runtime';

type ScenarioResult = {
  workers: number;
  tasks: number;
  totalMs: number;
  throughputPerSec: number;
  queueP95Ms: number;
  queueP50Ms: number;
};

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx] || 0);
}

async function runScenario(input: { workers: number; tasks: number; processingMs: number }): Promise<ScenarioResult> {
  const projectId = `bench-${input.workers}-${Date.now().toString(36)}`;
  await ProjectDispatchQueue.clearProjectAsync(projectId);
  const enqueueTs = Date.now();
  for (let i = 0; i < input.tasks; i += 1) {
    await ProjectDispatchQueue.enqueueAsync({
      runId: `bench-run-${i}`,
      projectId,
      chainId: 'bench-chain',
      pipelineId: 'benchmark',
      stageId: 'bench-stage',
      agentSlug: 'developer',
      payload: { idx: i },
    });
  }

  const queueLatencies: number[] = [];
  const startedAt = Date.now();

  const workerLoop = async (workerIndex: number) => {
    const workerId = `bench-worker-${workerIndex}`;
    while (true) {
      const task = await ProjectDispatchQueue.pickupForWorkerAsync(projectId, 'developer', workerId);
      if (!task) break;
      const pickedAt = Date.now();
      queueLatencies.push(Math.max(0, pickedAt - Number(task.enqueuedAt || enqueueTs)));
      await new Promise((resolve) => setTimeout(resolve, input.processingMs));
    }
  };

  await Promise.all(Array.from({ length: input.workers }, (_, idx) => workerLoop(idx + 1)));
  const totalMs = Math.max(1, Date.now() - startedAt);
  const throughputPerSec = Number(((input.tasks / totalMs) * 1000).toFixed(2));

  return {
    workers: input.workers,
    tasks: input.tasks,
    totalMs,
    throughputPerSec,
    queueP95Ms: percentile(queueLatencies, 95),
    queueP50Ms: percentile(queueLatencies, 50),
  };
}

async function main() {
  const tasks = Math.max(20, Number(process.env.BENCH_TASKS || 200));
  const processingMs = Math.max(1, Number(process.env.BENCH_PROCESSING_MS || 8));

  const baseline = await runScenario({ workers: 1, tasks, processingMs });
  const scaled = await runScenario({ workers: 4, tasks, processingMs });

  const speedup = Number((scaled.throughputPerSec / Math.max(0.01, baseline.throughputPerSec)).toFixed(2));
  const p95DeltaPct = Number((((scaled.queueP95Ms - baseline.queueP95Ms) / Math.max(1, baseline.queueP95Ms)) * 100).toFixed(2));

  const result = {
    tasks,
    processingMs,
    baseline,
    scaled,
    speedup,
    queueP95DeltaPct: p95DeltaPct,
    chokePointAssessment: {
      brokerSaturationRisk: scaled.queueP95Ms > baseline.queueP95Ms * 1.8 ? 'elevated' : 'acceptable',
      controlPlaneRisk: speedup < 1.5 ? 'elevated' : 'acceptable',
    },
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(String(error?.stack || error?.message || error));
  process.exit(1);
});
