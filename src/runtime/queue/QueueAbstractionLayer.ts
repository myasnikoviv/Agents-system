import { DispatchQueueTask, DlqQueueTask, ProjectDispatchQueue } from './ProjectDispatchQueue';

export interface QueueLease {
  leaseId: string;
  task: DispatchQueueTask;
  consumerId: string;
  dequeuedAt: number;
}

export interface DequeueRequest {
  projectId: string;
  agentSlug: string;
  consumerId: string;
  environmentId?: string;
}

export interface NackRequest {
  leaseId: string;
  reason?: string;
  requeue?: boolean;
}

const inflight = new Map<string, QueueLease>();

function buildLeaseId(task: DispatchQueueTask): string {
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${task.taskId}:lease:${Date.now().toString(36)}:${nonce}`;
}

export class QueueAbstractionLayer {
  static async enqueue(input: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): Promise<DispatchQueueTask> {
    return ProjectDispatchQueue.enqueueAsync(input);
  }

  static async dequeue(input: DequeueRequest): Promise<QueueLease | null> {
    const task = await ProjectDispatchQueue.pickupAsync(input.projectId, input.agentSlug, {
      environmentId: input.environmentId,
    });
    if (!task) return null;
    const lease: QueueLease = {
      leaseId: buildLeaseId(task),
      task,
      consumerId: String(input.consumerId || 'unknown-consumer').trim() || 'unknown-consumer',
      dequeuedAt: Date.now(),
    };
    inflight.set(lease.leaseId, lease);
    return lease;
  }

  static async ack(leaseId: string): Promise<boolean> {
    const key = String(leaseId || '').trim();
    if (!key) return false;
    return inflight.delete(key);
  }

  static async nack(input: NackRequest): Promise<DispatchQueueTask | null> {
    const key = String(input.leaseId || '').trim();
    if (!key) return null;
    const lease = inflight.get(key);
    if (!lease) return null;
    inflight.delete(key);
    if (input.requeue === false) return null;
    return this.enqueue({
      runId: lease.task.runId,
      projectId: lease.task.projectId,
      chainId: lease.task.chainId,
      pipelineId: lease.task.pipelineId,
      stageId: lease.task.stageId,
      agentSlug: lease.task.agentSlug,
      payload: {
        ...(lease.task.payload || {}),
        nackedAt: new Date().toISOString(),
        nackedBy: lease.consumerId,
        nackReason: String(input.reason || 'nack').trim() || 'nack',
        retryCount: Number((lease.task.payload as any)?.retryCount || 0) + 1,
        retryOfTaskId: lease.task.taskId,
      },
    });
  }

  static async retry(input: { projectId: string; taskId: string; actorId?: string }): Promise<DispatchQueueTask | null> {
    return ProjectDispatchQueue.retryTaskAsync(input);
  }

  static async toDlq(input: {
    task: DispatchQueueTask;
    reason: string;
    retriesExhausted: number;
    actorId?: string;
  }): Promise<DlqQueueTask> {
    return ProjectDispatchQueue.moveToDlqAsync(input);
  }

  static async listDlq(projectId?: string): Promise<DlqQueueTask[]> {
    return ProjectDispatchQueue.listDlqAsync(projectId);
  }

  static async requeueDlq(input: { projectId: string; dlqId: string; actorId?: string }): Promise<DispatchQueueTask | null> {
    return ProjectDispatchQueue.requeueDlqAsync(input);
  }

  static async setPriority(input: {
    projectId: string;
    taskId: string;
    priority: number;
    actorId?: string;
  }): Promise<DispatchQueueTask | null> {
    return ProjectDispatchQueue.setTaskPriorityAsync(input);
  }

  static async depth(projectId: string, agentSlug?: string, options?: { environmentId?: string }): Promise<number> {
    return ProjectDispatchQueue.depthAsync(projectId, agentSlug, options);
  }

  static async clear(): Promise<void> {
    inflight.clear();
    await ProjectDispatchQueue.clearAsync();
  }

  static inflightCount(): number {
    return inflight.size;
  }
}
