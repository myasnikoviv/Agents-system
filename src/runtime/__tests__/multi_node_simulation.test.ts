import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'child_process';
import path from 'path';

function runTsxEval(code: string): { ok: boolean; stdout: string; stderr: string } {
  const cwd = path.resolve(process.cwd());
  const out = spawnSync('npx', ['tsx', '-e', code], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env },
  });
  return {
    ok: out.status === 0,
    stdout: String(out.stdout || '').trim(),
    stderr: String(out.stderr || '').trim(),
  };
}

describe('Sprint25 AGSYS-2513 multi-node simulation', () => {
  it('shares queue across independent processes', () => {
    const clear = runTsxEval(`
      import { ProjectDispatchQueue } from './src/runtime/queue/ProjectDispatchQueue';
      ProjectDispatchQueue.clearProject('mn-proj');
      console.log('ok');
    `);
    expect(clear.ok).toBe(true);

    const enqueue = runTsxEval(`
      import { ProjectDispatchQueue } from './src/runtime/queue/ProjectDispatchQueue';
      const t = ProjectDispatchQueue.enqueue({
        runId: 'mn-run-1',
        projectId: 'mn-proj',
        chainId: 'mn-chain',
        pipelineId: 'unified-task-intake',
        stageId: 'dev',
        agentSlug: 'developer',
        payload: { marker: 'cross-process' },
      });
      console.log(JSON.stringify({ taskId: t.taskId }));
    `);
    expect(enqueue.ok).toBe(true);
    const enq = JSON.parse(enqueue.stdout || '{}') as { taskId?: string };
    expect(enq.taskId).toBeTruthy();

    const pickup = runTsxEval(`
      import { ProjectDispatchQueue } from './src/runtime/queue/ProjectDispatchQueue';
      const picked = ProjectDispatchQueue.pickup('mn-proj', 'developer');
      console.log(JSON.stringify({ taskId: picked?.taskId || null, marker: picked?.payload?.marker || null }));
    `);
    expect(pickup.ok).toBe(true);
    const got = JSON.parse(pickup.stdout || '{}') as { taskId?: string; marker?: string };
    expect(got.taskId).toBe(enq.taskId);
    expect(got.marker).toBe('cross-process');
  });

  it('shares worker pool state across independent processes', () => {
    const clear = runTsxEval(`
      import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager';
      DynamicWorkerSpawnManager.clear();
      console.log('ok');
    `);
    expect(clear.ok).toBe(true);

    const spawnWorker = runTsxEval(`
      import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager';
      (async () => {
        const out = await DynamicWorkerSpawnManager.ensureWorker(
          {
            runId: 'mn-run-2',
            projectId: 'mn-proj',
            chainId: 'mn-chain',
            agentSlug: 'developer',
            stageId: 'dev',
            pipelineId: 'feature-change',
          },
          { emitEvents: false },
        );
        console.log(JSON.stringify({ workerId: out.worker.workerId, spawned: out.spawned }));
      })().catch((err) => {
        console.error(String(err?.message || err || 'worker_spawn_failed'));
        process.exit(1);
      });
    `);
    expect(spawnWorker.ok).toBe(true);
    const created = JSON.parse(spawnWorker.stdout || '{}') as { workerId?: string };
    expect(created.workerId).toBeTruthy();

    const snapshot = runTsxEval(`
      import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager';
      const rows = DynamicWorkerSpawnManager.snapshot().filter((r) => r.projectId === 'mn-proj' && r.agentSlug === 'developer');
      console.log(JSON.stringify({ count: rows.length, workerId: rows[0]?.workerId || null }));
    `);
    expect(snapshot.ok).toBe(true);
    const snap = JSON.parse(snapshot.stdout || '{}') as { count?: number; workerId?: string };
    expect(Number(snap.count || 0)).toBeGreaterThan(0);
    expect(snap.workerId).toBe(created.workerId);
  });
});
