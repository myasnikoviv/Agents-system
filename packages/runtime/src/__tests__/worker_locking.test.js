"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamicWorkerSpawnManager_1 = require("../workers/DynamicWorkerSpawnManager");
const RunManager_1 = require("../context/RunManager");
const AgentIdentity_1 = require("../identity/AgentIdentity");
// Mock emitEvent to avoid side effects
jest.mock('@system/events', () => ({
    emitEvent: jest.fn().mockResolvedValue('event-id'),
    emitSwarmEvent: jest.fn().mockResolvedValue('swarm-event-id'),
}));
describe('Worker Locking and Cleanup (AGSYS-3425)', () => {
    beforeEach(async () => {
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.clearAsync();
        (0, AgentIdentity_1.clearIdentityRegistry)();
        jest.clearAllMocks();
    });
    it('retries lock acquisition when worker is busy', async () => {
        const runId = 'test-run-contention';
        const projectId = 'proj-1';
        const agentSlug = 'developer';
        // 1. Manually acquire lock to simulate "busy"
        const lockKey = `lock:worker:${projectId}:${agentSlug}`;
        // We can't easily access the private redis client, but we can call ensureWorker once
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'owner-run', projectId, chainId: 'c1', agentSlug }, { emitEvents: false });
        // 2. Try to acquire it again from another run
        // This should fail after retries
        const start = Date.now();
        await expect(DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId, projectId, chainId: 'c2', agentSlug }, { emitEvents: false })).rejects.toThrow('worker_lock_busy');
        const duration = Date.now() - start;
        // Should have retried 3 times with backoff (200ms, 400ms, 600ms)
        // Minimum duration should be around 1200ms
        expect(duration).toBeGreaterThanOrEqual(1000);
    });
    it('force releases all locks for a specific run', async () => {
        const runId = 'cleanup-run';
        const projectId = 'proj-1';
        // 1. Acquire multiple locks for the same run
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId, projectId, chainId: 'c1', agentSlug: 'developer' }, { emitEvents: false });
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId, projectId, chainId: 'c2', agentSlug: 'pm-orchestrator' }, { emitEvents: false });
        // 2. Verify we can acquire them again IF we release them
        // But first, verify they are locked (ensureWorker from another run fails)
        await expect(DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'other-run', projectId, chainId: 'c3', agentSlug: 'developer' }, { emitEvents: false })).rejects.toThrow('worker_lock_busy');
        // 3. Force release
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.forceReleaseAllLocksForRun(runId);
        // 4. Now ensureWorker for 'other-run' should succeed immediately (or spawn new)
        const lease = await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'other-run', projectId, chainId: 'c3', agentSlug: 'developer' }, { emitEvents: false });
        expect(lease.worker).toBeTruthy();
    });
    it('releases locks automatically when run is cancelled via RunManager', async () => {
        const runId = 'cancel-test-run';
        const projectId = 'proj-1';
        // 1. Lock a worker
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId, projectId, chainId: 'c1', agentSlug: 'developer' }, { emitEvents: false });
        // 2. Cancel run via RunManager
        // Note: RunManager might need initialization or mocking of context if it's too heavy
        await RunManager_1.RunManager.cancelRun(runId, 'user_requested');
        // 3. Verify lock is gone
        const lease = await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'new-run', projectId, chainId: 'c2', agentSlug: 'developer' }, { emitEvents: false });
        expect(lease.worker).toBeTruthy();
    });
});
