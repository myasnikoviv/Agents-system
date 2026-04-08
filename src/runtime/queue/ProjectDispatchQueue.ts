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
