import {
  acquireToolLease,
  cancelToolQueueRequest,
  listWorkbenchState,
  releaseToolLease,
  resetWorkbenchState,
} from '../AgentWorkbenchScheduler';

describe('AgentWorkbenchScheduler', () => {
  beforeEach(() => {
    resetWorkbenchState();
  });

  it('queues exclusive tool and promotes next owner on release', () => {
    const first = acquireToolLease('figma', 'agent-A');
    expect(first.status).toBe('acquired');

    const second = acquireToolLease('figma', 'agent-B');
    expect(second.status).toBe('queued');
    expect(second.queuePosition).toBeGreaterThanOrEqual(1);

    const released = releaseToolLease('figma', 'agent-A');
    expect(released.released).toBe(true);
    expect(released.nextOwner).toBe('agent-B');
  });

  it('keeps share-safe tool lock-free', () => {
    const one = acquireToolLease('plane', 'owner-1');
    const two = acquireToolLease('plane', 'owner-2');
    expect(one.status).toBe('acquired');
    expect(two.status).toBe('acquired');
    const state = listWorkbenchState();
    const plane = state.tools.find((t) => t.id === 'plane');
    expect(plane?.mode).toBe('share-safe');
    expect((plane?.holders || []).length).toBe(2);
  });

  it('returns already_acquired for re-entrant owner lock request', () => {
    const one = acquireToolLease('figma', 'agent-A');
    expect(one.status).toBe('acquired');
    const two = acquireToolLease('figma', 'agent-A');
    expect(two.status).toBe('already_acquired');
  });

  it('deduplicates queue owner and supports cancellation', () => {
    acquireToolLease('figma', 'agent-A');
    const firstQueue = acquireToolLease('figma', 'agent-B');
    const secondQueue = acquireToolLease('figma', 'agent-B');
    expect(firstQueue.status).toBe('queued');
    expect(secondQueue.status).toBe('queued');
    expect(secondQueue.queuePosition).toBe(1);

    const cancelled = cancelToolQueueRequest('figma', 'agent-B');
    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.queueLength).toBe(0);
  });
});
