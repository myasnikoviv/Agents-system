import { QueueAbstractionLayer } from '../queue/QueueAbstractionLayer';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';

describe('QueueAbstractionLayer', () => {
  beforeEach(async () => {
    await QueueAbstractionLayer.clear();
  });

  it('supports enqueue -> dequeue -> ack lifecycle', async () => {
    const queued = await QueueAbstractionLayer.enqueue({
      runId: 'r1',
      projectId: 'proj-a',
      chainId: 'c1',
      pipelineId: 'feature-change',
      stageId: 'dev',
      agentSlug: 'developer',
      payload: { priority: 3 },
    });
    expect(queued.taskId).toContain('proj-a:');

    const lease = await QueueAbstractionLayer.dequeue({
      projectId: 'proj-a',
      agentSlug: 'developer',
      consumerId: 'worker-1',
    });
    expect(lease?.task.taskId).toBe(queued.taskId);
    expect(QueueAbstractionLayer.inflightCount()).toBe(1);

    const acked = await QueueAbstractionLayer.ack(String(lease?.leaseId || ''));
    expect(acked).toBe(true);
    expect(QueueAbstractionLayer.inflightCount()).toBe(0);
  });

  it('supports nack with requeue and retry metadata', async () => {
    const queued = await QueueAbstractionLayer.enqueue({
      runId: 'r2',
      projectId: 'proj-a',
      chainId: 'c2',
      pipelineId: 'feature-change',
      stageId: 'qa',
      agentSlug: 'tdd-qa',
      payload: {},
    });
    const lease = await QueueAbstractionLayer.dequeue({
      projectId: 'proj-a',
      agentSlug: 'tdd-qa',
      consumerId: 'worker-qa-1',
    });
    expect(lease?.task.taskId).toBe(queued.taskId);

    const requeued = await QueueAbstractionLayer.nack({
      leaseId: String(lease?.leaseId || ''),
      reason: 'transient_failure',
    });
    expect(requeued?.taskId).toBeTruthy();
    expect((requeued?.payload as any)?.retryCount).toBe(1);
    expect((requeued?.payload as any)?.retryOfTaskId).toBe(queued.taskId);
    expect(await QueueAbstractionLayer.depth('proj-a', 'tdd-qa')).toBe(1);
  });

  it('supports priority update via abstraction API', async () => {
    const task = await ProjectDispatchQueue.enqueueAsync({
      runId: 'r3',
      projectId: 'proj-a',
      chainId: 'c3',
      pipelineId: 'feature-change',
      stageId: 'dev',
      agentSlug: 'developer',
      payload: { priority: 0 },
    });

    const updated = await QueueAbstractionLayer.setPriority({
      projectId: 'proj-a',
      taskId: task.taskId,
      priority: 50,
      actorId: 'tester',
    });
    expect((updated?.payload as any)?.priority).toBe(50);

    const lease = await QueueAbstractionLayer.dequeue({
      projectId: 'proj-a',
      agentSlug: 'developer',
      consumerId: 'worker-dev-1',
    });
    expect(lease?.task.taskId).toBe(task.taskId);
  });
});

