import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getRedisClient } from '../redisClient';
import { resolveRuntimeInfrastructureProfile } from '../infrastructure/RuntimeInfrastructureProfile';

export interface DispatchQueueTask {
  taskId: string;
  runId: string;
  projectId: string;
  chainId: string;
  pipelineId: string;
  stageId: string;
  agentSlug: string;
  payload?: Record<string, any>;
  enqueuedAt: number;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.resolve(process.cwd(), '.agent-system', 'dispatch-queue.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_queue (
      task_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      chain_id TEXT NOT NULL,
      pipeline_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      agent_slug TEXT NOT NULL,
      payload_json TEXT,
      enqueued_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dispatch_queue_project_agent ON dispatch_queue(project_id, agent_slug);
    CREATE INDEX IF NOT EXISTS idx_dispatch_queue_project ON dispatch_queue(project_id);
    CREATE INDEX IF NOT EXISTS idx_dispatch_queue_enqueued ON dispatch_queue(enqueued_at);
  `);
  return db;
}

function taskPriority(task: DispatchQueueTask): number {
  const raw = Number((task.payload as any)?.priority ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(-100, Math.min(100, raw));
}

function safeJson(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function rowToTask(row: any): DispatchQueueTask {
  return {
    taskId: String(row.task_id),
    runId: String(row.run_id),
    projectId: String(row.project_id),
    chainId: String(row.chain_id),
    pipelineId: String(row.pipeline_id),
    stageId: String(row.stage_id),
    agentSlug: String(row.agent_slug),
    payload: safeJson(row.payload_json),
    enqueuedAt: Number(row.enqueued_at || Date.now()),
  };
}

const REDIS_TASK_HASH_KEY = 'runtime:dispatch:tasks';
const REDIS_QUEUE_KEY_PREFIX = 'runtime:dispatch:queue';

function useRedisSharedQueue(): boolean {
  return resolveRuntimeInfrastructureProfile().dispatchQueueBackend === 'redis';
}

function queueEnvironmentIdFromPayload(payload?: Record<string, any>): string {
  return String((payload as any)?.environmentId || '').trim();
}

function normalizedEnvironmentSegment(environmentId?: string): string {
  const raw = String(environmentId || '').trim();
  if (!raw) return 'env-global';
  return raw.replace(/[^a-zA-Z0-9:_-]+/g, '_');
}

function redisQueueKeyForScope(projectId: string, agentSlug: string, environmentId?: string): string {
  return `${REDIS_QUEUE_KEY_PREFIX}:${projectId}:${normalizedEnvironmentSegment(environmentId)}:${agentSlug}`;
}

function queueMetricKey(task: DispatchQueueTask): string {
  const environmentId = queueEnvironmentIdFromPayload(task.payload);
  return environmentId
    ? `${task.projectId}:${environmentId}:${task.agentSlug}`
    : `${task.projectId}:env-global:${task.agentSlug}`;
}

function redisPriorityScore(task: DispatchQueueTask): number {
  const priority = taskPriority(task);
  const normalized = 100 - priority;
  return normalized * 1_000_000_000_000 + task.enqueuedAt;
}

export class ProjectDispatchQueue {
  private static async getTaskByIdAsync(projectId: string, taskId: string): Promise<DispatchQueueTask | null> {
    if (!useRedisSharedQueue()) {
      const db = getDb();
      const found = db
        .prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue WHERE project_id = ? AND task_id = ?`,
        )
        .get(projectId, taskId) as any;
      return found ? rowToTask(found) : null;
    }
    const redis = getRedisClient();
    const raw = await redis.hget(REDIS_TASK_HASH_KEY, taskId);
    if (!raw) return null;
    const parsed = safeJson(raw) as any;
    if (!parsed || typeof parsed !== 'object') return null;
    const task = parsed as DispatchQueueTask;
    if (String(task.projectId || '') !== projectId) return null;
    return task;
  }

  static enqueue(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): DispatchQueueTask {
    const nonce = Math.random().toString(36).slice(2, 8);
    const envPart = normalizedEnvironmentSegment(queueEnvironmentIdFromPayload(task.payload));
    const full: DispatchQueueTask = {
      ...task,
      taskId: `${task.projectId}:${envPart}:${task.agentSlug}:${Date.now().toString(36)}:${nonce}`,
      enqueuedAt: Date.now(),
    };
    const db = getDb();
    db.prepare(
      `INSERT INTO dispatch_queue (
        task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      full.taskId,
      full.runId,
      full.projectId,
      full.chainId,
      full.pipelineId,
      full.stageId,
      full.agentSlug,
      JSON.stringify(full.payload || {}),
      full.enqueuedAt,
    );
    return full;
  }

  static pickup(projectId: string, agentSlug: string, options?: { environmentId?: string }): DispatchQueueTask | null {
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    const db = getDb();
    const tx = db.transaction((pId: string, aSlug: string) => {
      const rows = db
        .prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue WHERE project_id = ? AND agent_slug = ?`,
        )
        .all(pId, aSlug) as Array<any>;
      if (!rows.length) return null;
      const eligible = rows.filter((row) => {
        if (!expectedEnvironmentId) return true;
        const payload = safeJson(row.payload_json);
        const environmentId = String((payload as any)?.environmentId || '').trim();
        return !environmentId || environmentId === expectedEnvironmentId;
      });
      if (!eligible.length) return null;
      eligible.sort((a, b) => {
        const pa = taskPriority({ payload: safeJson(a.payload_json) } as any);
        const pb = taskPriority({ payload: safeJson(b.payload_json) } as any);
        const byPriority = pb - pa;
        if (byPriority !== 0) return byPriority;
        return Number(a.enqueued_at) - Number(b.enqueued_at);
      });
      const next = eligible[0];
      if (!next) return null;
      db.prepare(`DELETE FROM dispatch_queue WHERE task_id = ?`).run(next.task_id);
      return rowToTask(next);
    });
    return tx(projectId, agentSlug);
  }

  static pickupForWorker(projectId: string, agentSlug: string, workerId: string): DispatchQueueTask | null {
    const worker = String(workerId || '').trim();
    if (!worker) return null;
    const next = this.pickup(projectId, agentSlug);
    if (!next) return null;
    return {
      ...next,
      payload: {
        ...(next.payload || {}),
        dispatchMode: 'worker_pull',
        pulledByWorkerId: worker,
        pulledAt: new Date().toISOString(),
      },
    };
  }

  static depth(projectId: string, agentSlug?: string, options?: { environmentId?: string }): number {
    const db = getDb();
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    const allRows = (agentSlug
      ? db
          .prepare(
            `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
             FROM dispatch_queue WHERE project_id = ? AND agent_slug = ?`,
          )
          .all(projectId, agentSlug)
      : db
          .prepare(
            `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
             FROM dispatch_queue WHERE project_id = ?`,
          )
          .all(projectId)) as Array<any>;
    if (!expectedEnvironmentId) return allRows.length;
    return allRows.filter((row) => {
      const payload = safeJson(row.payload_json);
      const environmentId = String((payload as any)?.environmentId || '').trim();
      return environmentId === expectedEnvironmentId;
    }).length;
  }

  static snapshot(projectId?: string, options?: { environmentId?: string }): Record<string, number> {
    const db = getDb();
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    const out: Record<string, number> = {};
    const rows = (projectId
      ? db.prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue WHERE project_id = ?`,
        ).all(projectId)
      : db.prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue`,
        ).all()) as Array<any>;
    for (const row of rows) {
      const task = rowToTask(row);
      const env = queueEnvironmentIdFromPayload(task.payload);
      if (expectedEnvironmentId && env !== expectedEnvironmentId) continue;
      const key = queueMetricKey(task);
      out[key] = Number(out[key] || 0) + 1;
    }
    return out;
  }

  static listTasks(projectId?: string): DispatchQueueTask[] {
    const db = getDb();
    const rows = (projectId
      ? db.prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue WHERE project_id = ?`,
        ).all(projectId)
      : db.prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue`,
        ).all()) as Array<any>;
    return rows.map(rowToTask).sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  static reassignTask(input: { projectId: string; taskId: string; toAgentSlug: string; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const toAgentSlug = String(input.toAgentSlug || '').trim();
    if (!projectId || !taskId || !toAgentSlug) return null;
    const db = getDb();
    const found = db
      .prepare(
        `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
         FROM dispatch_queue WHERE project_id = ? AND task_id = ?`,
      )
      .get(projectId, taskId) as any;
    if (!found) return null;
    db.prepare(`DELETE FROM dispatch_queue WHERE task_id = ?`).run(taskId);
    const task = rowToTask(found);
    return this.enqueue({
      runId: task.runId,
      projectId: task.projectId,
      chainId: task.chainId,
      pipelineId: task.pipelineId,
      stageId: task.stageId,
      agentSlug: toAgentSlug,
      payload: {
        ...(task.payload || {}),
        reassignedFromAgent: task.agentSlug,
        reassignedAt: new Date().toISOString(),
        reassignedBy: input.actorId || 'cockpit-user',
        reassignedFromTaskId: task.taskId,
      },
    });
  }

  static retryTask(input: { projectId: string; taskId: string; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    const db = getDb();
    const found = db
      .prepare(
        `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
         FROM dispatch_queue WHERE project_id = ? AND task_id = ?`,
      )
      .get(projectId, taskId) as any;
    if (!found) return null;
    const task = rowToTask(found);
    const retryCount = Number((task.payload as any)?.retryCount || 0) + 1;
    return this.enqueue({
      runId: task.runId,
      projectId: task.projectId,
      chainId: task.chainId,
      pipelineId: task.pipelineId,
      stageId: task.stageId,
      agentSlug: task.agentSlug,
      payload: {
        ...(task.payload || {}),
        retryCount,
        retryOfTaskId: task.taskId,
        retriedAt: new Date().toISOString(),
        retriedBy: input.actorId || 'cockpit-user',
      },
    });
  }

  static cancelTask(input: { projectId: string; taskId: string; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    const db = getDb();
    const found = db
      .prepare(
        `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
         FROM dispatch_queue WHERE project_id = ? AND task_id = ?`,
      )
      .get(projectId, taskId) as any;
    if (!found) return null;
    db.prepare(`DELETE FROM dispatch_queue WHERE task_id = ?`).run(taskId);
    const task = rowToTask(found);
    return {
      ...task,
      payload: {
        ...(task.payload || {}),
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: input.actorId || 'cockpit-user',
      },
    };
  }

  static setTaskPriority(input: { projectId: string; taskId: string; priority: number; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const priority = Number(input.priority);
    if (!projectId || !taskId || !Number.isFinite(priority)) return null;
    const db = getDb();
    const found = db
      .prepare(
        `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
         FROM dispatch_queue WHERE project_id = ? AND task_id = ?`,
      )
      .get(projectId, taskId) as any;
    if (!found) return null;
    const task = rowToTask(found);
    const nextPayload = {
      ...(task.payload || {}),
      priority: Math.max(-100, Math.min(100, priority)),
      priorityOverriddenAt: new Date().toISOString(),
      priorityOverriddenBy: input.actorId || 'cockpit-user',
    };
    db.prepare(`UPDATE dispatch_queue SET payload_json = ? WHERE task_id = ?`).run(JSON.stringify(nextPayload), taskId);
    return { ...task, payload: nextPayload };
  }

  static clearProject(projectId: string): number {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as c FROM dispatch_queue WHERE project_id = ?`).get(projectId) as any;
    db.prepare(`DELETE FROM dispatch_queue WHERE project_id = ?`).run(projectId);
    return Number(row?.c || 0);
  }

  static clear(): void {
    const db = getDb();
    db.prepare(`DELETE FROM dispatch_queue`).run();
  }

  static async enqueueAsync(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): Promise<DispatchQueueTask> {
    if (!useRedisSharedQueue()) {
      return this.enqueue(task);
    }
    const nonce = Math.random().toString(36).slice(2, 8);
    const envPart = normalizedEnvironmentSegment(queueEnvironmentIdFromPayload(task.payload));
    const full: DispatchQueueTask = {
      ...task,
      taskId: `${task.projectId}:${envPart}:${task.agentSlug}:${Date.now().toString(36)}:${nonce}`,
      enqueuedAt: Date.now(),
    };
    const redis = getRedisClient();
    const serialized = JSON.stringify(full);
    const zkey = redisQueueKeyForScope(full.projectId, full.agentSlug, queueEnvironmentIdFromPayload(full.payload));
    const score = redisPriorityScore(full);
    await redis.multi().hset(REDIS_TASK_HASH_KEY, full.taskId, serialized).zadd(zkey, score, full.taskId).exec();
    return full;
  }

  static async pickupAsync(projectId: string, agentSlug: string, options?: { environmentId?: string }): Promise<DispatchQueueTask | null> {
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    if (!useRedisSharedQueue()) {
      return this.pickup(projectId, agentSlug, options);
    }
    const redis = getRedisClient();
    const zkey = redisQueueKeyForScope(projectId, agentSlug, expectedEnvironmentId);
    const ids = (await redis.zrange(zkey, 0, 50)) || [];
    for (const id of ids) {
      const payload = await redis.hget(REDIS_TASK_HASH_KEY, id);
      if (!payload) {
        await redis.zrem(zkey, id);
        continue;
      }
      const parsed = safeJson(payload);
      if (!parsed || typeof parsed !== 'object') {
        await redis.multi().zrem(zkey, id).hdel(REDIS_TASK_HASH_KEY, id).exec();
        continue;
      }
      const task = parsed as DispatchQueueTask;
      const taskEnvironmentId = String((task.payload as any)?.environmentId || '').trim();
      if (expectedEnvironmentId && taskEnvironmentId && taskEnvironmentId !== expectedEnvironmentId) {
        continue;
      }
      const removed = await redis.zrem(zkey, id);
      if (Number(removed || 0) !== 1) continue;
      await redis.hdel(REDIS_TASK_HASH_KEY, id);
      return task;
    }
    return null;
  }

  static async pickupForWorkerAsync(
    projectId: string,
    agentSlug: string,
    workerId: string,
    options?: { environmentId?: string },
  ): Promise<DispatchQueueTask | null> {
    const worker = String(workerId || '').trim();
    if (!worker) return null;
    const next = await this.pickupAsync(projectId, agentSlug, options);
    if (!next) return null;
    return {
      ...next,
      payload: {
        ...(next.payload || {}),
        dispatchMode: 'worker_pull',
        pulledByWorkerId: worker,
        pulledAt: new Date().toISOString(),
      },
    };
  }

  static async depthAsync(projectId: string, agentSlug?: string, options?: { environmentId?: string }): Promise<number> {
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    if (!useRedisSharedQueue()) {
      return this.depth(projectId, agentSlug, options);
    }
    const redis = getRedisClient();
    if (agentSlug) {
      return Number(await redis.zcard(redisQueueKeyForScope(projectId, agentSlug, expectedEnvironmentId)));
    }
    let total = 0;
    let cursor = '0';
    const match = `${REDIS_QUEUE_KEY_PREFIX}:${projectId}:${expectedEnvironmentId ? normalizedEnvironmentSegment(expectedEnvironmentId) : '*'}:*`;
    do {
      const reply = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = String(reply[0] || '0');
      const keys = Array.isArray(reply[1]) ? (reply[1] as string[]) : [];
      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const key of keys) pipeline.zcard(key);
        const rows = await pipeline.exec();
        for (const row of rows || []) {
          if (!row || row[0]) continue;
          total += Number(row[1] || 0);
        }
      }
    } while (cursor !== '0');
    return total;
  }

  static async listTasksAsync(projectId?: string): Promise<DispatchQueueTask[]> {
    if (!useRedisSharedQueue()) {
      return this.listTasks(projectId);
    }
    const redis = getRedisClient();
    const raw = await redis.hgetall(REDIS_TASK_HASH_KEY);
    const out: DispatchQueueTask[] = [];
    for (const value of Object.values(raw || {})) {
      const parsed = safeJson(String(value || '')) as any;
      if (!parsed || typeof parsed !== 'object') continue;
      const task = parsed as DispatchQueueTask;
      if (projectId && String(task.projectId || '') !== projectId) continue;
      out.push(task);
    }
    return out.sort((a, b) => Number(a.enqueuedAt || 0) - Number(b.enqueuedAt || 0));
  }

  static async snapshotAsync(projectId?: string, options?: { environmentId?: string }): Promise<Record<string, number>> {
    const expectedEnvironmentId = String(options?.environmentId || '').trim();
    if (!useRedisSharedQueue()) {
      return this.snapshot(projectId, options);
    }
    const tasks = await this.listTasksAsync(projectId);
    const out: Record<string, number> = {};
    for (const task of tasks) {
      const env = queueEnvironmentIdFromPayload(task.payload);
      if (expectedEnvironmentId && env !== expectedEnvironmentId) continue;
      const key = queueMetricKey(task);
      out[key] = Number(out[key] || 0) + 1;
    }
    return out;
  }

  static async reassignTaskAsync(input: {
    projectId: string;
    taskId: string;
    toAgentSlug: string;
    actorId?: string;
  }): Promise<DispatchQueueTask | null> {
    if (!useRedisSharedQueue()) {
      return this.reassignTask(input);
    }
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const toAgentSlug = String(input.toAgentSlug || '').trim();
    if (!projectId || !taskId || !toAgentSlug) return null;
    const task = await this.getTaskByIdAsync(projectId, taskId);
    if (!task) return null;

    const redis = getRedisClient();
    await redis
      .multi()
      .zrem(redisQueueKeyForScope(task.projectId, task.agentSlug, queueEnvironmentIdFromPayload(task.payload)), task.taskId)
      .hdel(REDIS_TASK_HASH_KEY, task.taskId)
      .exec();

    return this.enqueueAsync({
      runId: task.runId,
      projectId: task.projectId,
      chainId: task.chainId,
      pipelineId: task.pipelineId,
      stageId: task.stageId,
      agentSlug: toAgentSlug,
      payload: {
        ...(task.payload || {}),
        reassignedFromAgent: task.agentSlug,
        reassignedAt: new Date().toISOString(),
        reassignedBy: input.actorId || 'cockpit-user',
        reassignedFromTaskId: task.taskId,
      },
    });
  }

  static async retryTaskAsync(input: { projectId: string; taskId: string; actorId?: string }): Promise<DispatchQueueTask | null> {
    if (!useRedisSharedQueue()) {
      return this.retryTask(input);
    }
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    const task = await this.getTaskByIdAsync(projectId, taskId);
    if (!task) return null;
    const retryCount = Number((task.payload as any)?.retryCount || 0) + 1;
    return this.enqueueAsync({
      runId: task.runId,
      projectId: task.projectId,
      chainId: task.chainId,
      pipelineId: task.pipelineId,
      stageId: task.stageId,
      agentSlug: task.agentSlug,
      payload: {
        ...(task.payload || {}),
        retryCount,
        retryOfTaskId: task.taskId,
        retriedAt: new Date().toISOString(),
        retriedBy: input.actorId || 'cockpit-user',
      },
    });
  }

  static async cancelTaskAsync(input: { projectId: string; taskId: string; actorId?: string }): Promise<DispatchQueueTask | null> {
    if (!useRedisSharedQueue()) {
      return this.cancelTask(input);
    }
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    const task = await this.getTaskByIdAsync(projectId, taskId);
    if (!task) return null;
    const redis = getRedisClient();
    await redis
      .multi()
      .zrem(redisQueueKeyForScope(task.projectId, task.agentSlug, queueEnvironmentIdFromPayload(task.payload)), task.taskId)
      .hdel(REDIS_TASK_HASH_KEY, task.taskId)
      .exec();
    return {
      ...task,
      payload: {
        ...(task.payload || {}),
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: input.actorId || 'cockpit-user',
      },
    };
  }

  static async setTaskPriorityAsync(input: {
    projectId: string;
    taskId: string;
    priority: number;
    actorId?: string;
  }): Promise<DispatchQueueTask | null> {
    if (!useRedisSharedQueue()) {
      return this.setTaskPriority(input);
    }
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const priority = Number(input.priority);
    if (!projectId || !taskId || !Number.isFinite(priority)) return null;
    const task = await this.getTaskByIdAsync(projectId, taskId);
    if (!task) return null;
    const nextPayload = {
      ...(task.payload || {}),
      priority: Math.max(-100, Math.min(100, priority)),
      priorityOverriddenAt: new Date().toISOString(),
      priorityOverriddenBy: input.actorId || 'cockpit-user',
    };
    const updated: DispatchQueueTask = { ...task, payload: nextPayload };
    const redis = getRedisClient();
    await redis
      .multi()
      .hset(REDIS_TASK_HASH_KEY, task.taskId, JSON.stringify(updated))
      .zadd(
        redisQueueKeyForScope(task.projectId, task.agentSlug, queueEnvironmentIdFromPayload(task.payload)),
        redisPriorityScore(updated),
        task.taskId,
      )
      .exec();
    return updated;
  }

  static async clearProjectAsync(projectId: string): Promise<number> {
    if (!useRedisSharedQueue()) {
      return this.clearProject(projectId);
    }
    const redis = getRedisClient();
    const match = `${REDIS_QUEUE_KEY_PREFIX}:${projectId}:*`;
    let cursor = '0';
    let removed = 0;
    do {
      const reply = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = String(reply[0] || '0');
      const keys = Array.isArray(reply[1]) ? (reply[1] as string[]) : [];
      for (const key of keys) {
        const ids = await redis.zrange(key, 0, -1);
        removed += ids.length;
        const tx = redis.multi();
        if (ids.length > 0) tx.hdel(REDIS_TASK_HASH_KEY, ...ids);
        tx.del(key);
        await tx.exec();
      }
    } while (cursor !== '0');
    return removed;
  }

  static async clearAsync(): Promise<void> {
    if (!useRedisSharedQueue()) {
      this.clear();
      return;
    }
    const redis = getRedisClient();
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, 'MATCH', `${REDIS_QUEUE_KEY_PREFIX}:*`, 'COUNT', 500);
      cursor = String(reply[0] || '0');
      const keys = Array.isArray(reply[1]) ? (reply[1] as string[]) : [];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
    await redis.del(REDIS_TASK_HASH_KEY);
  }
}
