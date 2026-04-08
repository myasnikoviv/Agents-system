import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';

describe('ProjectDispatchQueue', () => {
  beforeEach(() => {
    ProjectDispatchQueue.clear();
  });

  it('keeps project and agent scoped queues isolated', () => {
    ProjectDispatchQueue.enqueue({
      runId: 'r1',
      projectId: 'proj-a',
      chainId: 'c1',
      pipelineId: 'unified-task-intake',
      stageId: '1',
      agentSlug: 'developer',
    });
    ProjectDispatchQueue.enqueue({
      runId: 'r2',
      projectId: 'proj-b',
      chainId: 'c2',
      pipelineId: 'unified-task-intake',
      stageId: '1',
      agentSlug: 'developer',
    });

    expect(ProjectDispatchQueue.depth('proj-a')).toBe(1);
    expect(ProjectDispatchQueue.depth('proj-b')).toBe(1);
    expect(ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(1);
  });

  it('supports enqueue -> pickup flow', () => {
    const queued = ProjectDispatchQueue.enqueue({
      runId: 'r3',
      projectId: 'proj-a',
      chainId: 'c3',
      pipelineId: 'feature-change',
      stageId: 'dev',
      agentSlug: 'developer',
      payload: { x: 1 },
    });
    const picked = ProjectDispatchQueue.pickup('proj-a', 'developer');
    expect(picked?.taskId).toBe(queued.taskId);
    expect(ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(0);
  });
});

