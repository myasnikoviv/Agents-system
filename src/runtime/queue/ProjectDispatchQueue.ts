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

const queues = new Map<string, DispatchQueueTask[]>(); // key = projectId:agentSlug

function queueKey(projectId: string, agentSlug: string): string {
  return `${projectId}:${agentSlug}`;
}

function taskPriority(task: DispatchQueueTask): number {
  const raw = Number((task.payload as any)?.priority ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(-100, Math.min(100, raw));
}

export class ProjectDispatchQueue {
  static enqueue(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): DispatchQueueTask {
    const full: DispatchQueueTask = {
      ...task,
      taskId: `${task.projectId}:${task.agentSlug}:${Date.now().toString(36)}`,
      enqueuedAt: Date.now(),
    };
    const key = queueKey(task.projectId, task.agentSlug);
    const current = queues.get(key) || [];
    current.push(full);
    current.sort((a, b) => {
      const byPriority = taskPriority(b) - taskPriority(a);
      if (byPriority !== 0) return byPriority;
      return a.enqueuedAt - b.enqueuedAt;
    });
    queues.set(key, current);
    return full;
  }

  static pickup(projectId: string, agentSlug: string): DispatchQueueTask | null {
    const key = queueKey(projectId, agentSlug);
    const current = queues.get(key) || [];
    if (current.length === 0) return null;
    const next = current.shift() || null;
    queues.set(key, current);
    return next;
  }

  static depth(projectId: string, agentSlug?: string): number {
    if (agentSlug) {
      return (queues.get(queueKey(projectId, agentSlug)) || []).length;
    }
    let total = 0;
    for (const [key, items] of queues.entries()) {
      if (key.startsWith(`${projectId}:`)) total += items.length;
    }
    return total;
  }

  static snapshot(projectId?: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, items] of queues.entries()) {
      if (projectId && !key.startsWith(`${projectId}:`)) continue;
      out[key] = items.length;
    }
    return out;
  }

  static listTasks(projectId?: string): DispatchQueueTask[] {
    const out: DispatchQueueTask[] = [];
    for (const [key, items] of queues.entries()) {
      if (projectId && !key.startsWith(`${projectId}:`)) continue;
      for (const item of items) out.push({ ...item });
    }
    return out.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  static reassignTask(input: {
    projectId: string;
    taskId: string;
    toAgentSlug: string;
    actorId?: string;
  }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const toAgentSlug = String(input.toAgentSlug || '').trim();
    if (!projectId || !taskId || !toAgentSlug) return null;

    for (const [key, items] of queues.entries()) {
      if (!key.startsWith(`${projectId}:`)) continue;
      const idx = items.findIndex((x) => x.taskId === taskId);
      if (idx < 0) continue;
      const [found] = items.splice(idx, 1);
      queues.set(key, items);
      if (!found) return null;
      return this.enqueue({
        runId: found.runId,
        projectId: found.projectId,
        chainId: found.chainId,
        pipelineId: found.pipelineId,
        stageId: found.stageId,
        agentSlug: toAgentSlug,
        payload: {
          ...(found.payload || {}),
          reassignedFromAgent: found.agentSlug,
          reassignedAt: new Date().toISOString(),
          reassignedBy: input.actorId || 'cockpit-user',
          reassignedFromTaskId: found.taskId,
        },
      });
    }
    return null;
  }

  static retryTask(input: { projectId: string; taskId: string; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    for (const [key, items] of queues.entries()) {
      if (!key.startsWith(`${projectId}:`)) continue;
      const found = items.find((x) => x.taskId === taskId);
      if (!found) continue;
      const retryCount = Number((found.payload as any)?.retryCount || 0) + 1;
      return this.enqueue({
        runId: found.runId,
        projectId: found.projectId,
        chainId: found.chainId,
        pipelineId: found.pipelineId,
        stageId: found.stageId,
        agentSlug: found.agentSlug,
        payload: {
          ...(found.payload || {}),
          retryCount,
          retryOfTaskId: found.taskId,
          retriedAt: new Date().toISOString(),
          retriedBy: input.actorId || 'cockpit-user',
        },
      });
    }
    return null;
  }

  static cancelTask(input: { projectId: string; taskId: string; actorId?: string }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    if (!projectId || !taskId) return null;
    for (const [key, items] of queues.entries()) {
      if (!key.startsWith(`${projectId}:`)) continue;
      const idx = items.findIndex((x) => x.taskId === taskId);
      if (idx < 0) continue;
      const [found] = items.splice(idx, 1);
      queues.set(key, items);
      if (!found) return null;
      return {
        ...found,
        payload: {
          ...(found.payload || {}),
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: input.actorId || 'cockpit-user',
        },
      };
    }
    return null;
  }

  static setTaskPriority(input: {
    projectId: string;
    taskId: string;
    priority: number;
    actorId?: string;
  }): DispatchQueueTask | null {
    const projectId = String(input.projectId || '').trim();
    const taskId = String(input.taskId || '').trim();
    const priority = Number(input.priority);
    if (!projectId || !taskId || !Number.isFinite(priority)) return null;
    for (const [key, items] of queues.entries()) {
      if (!key.startsWith(`${projectId}:`)) continue;
      const idx = items.findIndex((x) => x.taskId === taskId);
      if (idx < 0) continue;
      const target = items[idx];
      if (!target) return null;
      target.payload = {
        ...(target.payload || {}),
        priority: Math.max(-100, Math.min(100, priority)),
        priorityOverriddenAt: new Date().toISOString(),
        priorityOverriddenBy: input.actorId || 'cockpit-user',
      };
      items.sort((a, b) => {
        const byPriority = taskPriority(b) - taskPriority(a);
        if (byPriority !== 0) return byPriority;
        return a.enqueuedAt - b.enqueuedAt;
      });
      queues.set(key, items);
      return { ...target };
    }
    return null;
  }

  static clearProject(projectId: string): number {
    const prefix = `${projectId}:`;
    let removed = 0;
    for (const key of Array.from(queues.keys())) {
      if (!key.startsWith(prefix)) continue;
      removed += (queues.get(key) || []).length;
      queues.delete(key);
    }
    return removed;
  }

  static clear(): void {
    queues.clear();
  }
}
