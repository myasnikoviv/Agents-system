"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentWorkbenchScheduler_1 = require("../AgentWorkbenchScheduler");
describe('AgentWorkbenchScheduler', () => {
    beforeEach(() => {
        (0, AgentWorkbenchScheduler_1.resetWorkbenchState)();
    });
    it('queues exclusive tool and promotes next owner on release', () => {
        const first = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A');
        expect(first.status).toBe('acquired');
        const second = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-B');
        expect(second.status).toBe('queued');
        expect(second.queuePosition).toBeGreaterThanOrEqual(1);
        const released = (0, AgentWorkbenchScheduler_1.releaseToolLease)('figma', 'agent-A');
        expect(released.released).toBe(true);
        expect(released.nextOwner).toBe('agent-B');
    });
    it('keeps share-safe tool lock-free', () => {
        const one = (0, AgentWorkbenchScheduler_1.acquireToolLease)('plane', 'owner-1');
        const two = (0, AgentWorkbenchScheduler_1.acquireToolLease)('plane', 'owner-2');
        expect(one.status).toBe('acquired');
        expect(two.status).toBe('acquired');
        const state = (0, AgentWorkbenchScheduler_1.listWorkbenchState)();
        const plane = state.tools.find((t) => t.id === 'plane');
        expect(plane?.mode).toBe('share-safe');
        expect((plane?.holders || []).length).toBe(2);
    });
    it('returns already_acquired for re-entrant owner lock request', () => {
        const one = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A');
        expect(one.status).toBe('acquired');
        const two = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A');
        expect(two.status).toBe('already_acquired');
    });
    it('deduplicates queue owner and supports cancellation', () => {
        (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A');
        const firstQueue = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-B');
        const secondQueue = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-B');
        expect(firstQueue.status).toBe('queued');
        expect(secondQueue.status).toBe('queued');
        expect(secondQueue.queuePosition).toBe(1);
        const cancelled = (0, AgentWorkbenchScheduler_1.cancelToolQueueRequest)('figma', 'agent-B');
        expect(cancelled.cancelled).toBe(true);
        expect(cancelled.queueLength).toBe(0);
    });
    it('isolates exclusive leases by scope key', () => {
        const one = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A', 'tenant:t1:workspace:w1');
        const two = (0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-B', 'tenant:t2:workspace:w2');
        expect(one.status).toBe('acquired');
        expect(two.status).toBe('acquired');
    });
});
