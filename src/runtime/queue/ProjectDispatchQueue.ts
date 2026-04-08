import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

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

export class ProjectDispatchQueue {
  static enqueue(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): DispatchQueueTask {
    const nonce = Math.random().toString(36).slice(2, 8);
    const full: DispatchQueueTask = {
      ...task,
      taskId: `${task.projectId}:${task.agentSlug}:${Date.now().toString(36)}:${nonce}`,
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

  static pickup(projectId: string, agentSlug: string): DispatchQueueTask | null {
    const db = getDb();
    const tx = db.transaction((pId: string, aSlug: string) => {
      const rows = db
        .prepare(
          `SELECT task_id, run_id, project_id, chain_id, pipeline_id, stage_id, agent_slug, payload_json, enqueued_at
           FROM dispatch_queue WHERE project_id = ? AND agent_slug = ?`,
        )
        .all(pId, aSlug) as Array<any>;
      if (!rows.length) return null;
      rows.sort((a, b) => {
        const pa = taskPriority({ payload: safeJson(a.payload_json) } as any);
        const pb = taskPriority({ payload: safeJson(b.payload_json) } as any);
        const byPriority = pb - pa;
        if (byPriority !== 0) return byPriority;
        return Number(a.enqueued_at) - Number(b.enqueued_at);
      });
      const next = rows[0];
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

  static depth(projectId: string, agentSlug?: string): number {
    const db = getDb();
    if (agentSlug) {
      const row = db.prepare(`SELECT COUNT(*) as c FROM dispatch_queue WHERE project_id = ? AND agent_slug = ?`).get(projectId, agentSlug) as any;
      return Number(row?.c || 0);
    }
    const row = db.prepare(`SELECT COUNT(*) as c FROM dispatch_queue WHERE project_id = ?`).get(projectId) as any;
    return Number(row?.c || 0);
  }

  static snapshot(projectId?: string): Record<string, number> {
    const db = getDb();
    const out: Record<string, number> = {};
    const rows = (projectId
      ? db.prepare(`SELECT project_id, agent_slug, COUNT(*) as c FROM dispatch_queue WHERE project_id = ? GROUP BY project_id, agent_slug`).all(projectId)
      : db.prepare(`SELECT project_id, agent_slug, COUNT(*) as c FROM dispatch_queue GROUP BY project_id, agent_slug`).all()) as Array<any>;
    for (const row of rows) out[`${row.project_id}:${row.agent_slug}`] = Number(row.c || 0);
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
}
