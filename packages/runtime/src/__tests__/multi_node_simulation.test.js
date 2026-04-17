"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
function runTsxEval(code) {
    const cwd = path_1.default.resolve(process.cwd());
    const out = (0, child_process_1.spawnSync)('npx', ['tsx', '-e', code], {
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
function parseLastJsonLine(stdout) {
    const lines = String(stdout || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (!line)
            continue;
        try {
            return JSON.parse(line);
        }
        catch {
            // keep scanning backward
        }
    }
    return {};
}
(0, globals_1.describe)('Sprint25 AGSYS-2513 multi-node simulation', () => {
    (0, globals_1.it)('shares queue across independent processes', () => {
        const clear = runTsxEval(`
      import { ProjectDispatchQueue } from './src/runtime/queue/ProjectDispatchQueue';
      ProjectDispatchQueue.clearProject('mn-proj');
      console.log('ok');
      process.exit(0);
    `);
        (0, globals_1.expect)(clear.ok).toBe(true);
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
      process.exit(0);
    `);
        (0, globals_1.expect)(enqueue.ok).toBe(true);
        const enq = parseLastJsonLine(enqueue.stdout);
        (0, globals_1.expect)(enq.taskId).toBeTruthy();
        const pickup = runTsxEval(`
      import { ProjectDispatchQueue } from './src/runtime/queue/ProjectDispatchQueue';
      const picked = ProjectDispatchQueue.pickup('mn-proj', 'developer');
      console.log(JSON.stringify({ taskId: picked?.taskId || null, marker: picked?.payload?.marker || null }));
      process.exit(0);
    `);
        (0, globals_1.expect)(pickup.ok).toBe(true);
        const got = parseLastJsonLine(pickup.stdout);
        (0, globals_1.expect)(got.taskId).toBe(enq.taskId);
        (0, globals_1.expect)(got.marker).toBe('cross-process');
    });
    (0, globals_1.it)('shares worker pool state across independent processes', () => {
        const clear = runTsxEval(`
      import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager';
      DynamicWorkerSpawnManager.clear();
      console.log('ok');
      process.exit(0);
    `);
        (0, globals_1.expect)(clear.ok).toBe(true);
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
        process.exit(0);
      })().catch((err) => {
        console.error(String(err?.message || err || 'worker_spawn_failed'));
        process.exit(1);
      });
    `);
        (0, globals_1.expect)(spawnWorker.ok).toBe(true);
        const created = parseLastJsonLine(spawnWorker.stdout);
        (0, globals_1.expect)(created.workerId).toBeTruthy();
        const snapshot = runTsxEval(`
      import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager';
      const rows = DynamicWorkerSpawnManager.snapshot().filter((r) => r.projectId === 'mn-proj' && r.agentSlug === 'developer');
      console.log(JSON.stringify({ count: rows.length, workerId: rows[0]?.workerId || null }));
      process.exit(0);
    `);
        (0, globals_1.expect)(snapshot.ok).toBe(true);
        const snap = parseLastJsonLine(snapshot.stdout);
        (0, globals_1.expect)(Number(snap.count || 0)).toBeGreaterThan(0);
        (0, globals_1.expect)(snap.workerId).toBe(created.workerId);
    });
});
