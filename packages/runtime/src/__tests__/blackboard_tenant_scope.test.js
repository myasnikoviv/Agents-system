"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store = new Map();
const hashStore = new Map();
const listStore = new Map();
jest.mock('../redisClient', () => ({
    getRedisClient: () => ({
        async lrange(key, start, end) {
            const list = listStore.get(key) || [];
            const from = Math.max(0, start);
            const to = end < 0 ? list.length : end + 1;
            return list.slice(from, to);
        },
        async rpush(key, value) {
            const list = listStore.get(key) || [];
            list.push(value);
            listStore.set(key, list);
            return list.length;
        },
        async hgetall(key) {
            const m = hashStore.get(key) || new Map();
            return Object.fromEntries(m.entries());
        },
        async hset(key, field, value) {
            const m = hashStore.get(key) || new Map();
            m.set(field, value);
            hashStore.set(key, m);
            return 1;
        },
        async get(key) {
            return store.get(key) || null;
        },
        async set(key, value) {
            store.set(key, value);
            return 'OK';
        },
    }),
}));
const BlackboardService_1 = require("../BlackboardService");
describe('BlackboardService tenant/workspace scoping', () => {
    beforeEach(() => {
        store.clear();
        hashStore.clear();
        listStore.clear();
    });
    it('isolates facts by tenant namespace even with same project/chain/run ids', async () => {
        const sharedPathA = { tenantId: 'tenant-A', workspaceId: 'ws-1', projectId: 'proj-1', chainId: 'chain-1', runId: 'run-1' };
        const sharedPathB = { tenantId: 'tenant-B', workspaceId: 'ws-1', projectId: 'proj-1', chainId: 'chain-1', runId: 'run-1' };
        await BlackboardService_1.BlackboardService.publishFact(sharedPathA, 'owner', { value: 'A' }, 'run');
        await BlackboardService_1.BlackboardService.publishFact(sharedPathB, 'owner', { value: 'B' }, 'run');
        const ctxA = { ...sharedPathA, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        const ctxB = { ...sharedPathB, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        await BlackboardService_1.BlackboardService.hydrate(ctxA);
        await BlackboardService_1.BlackboardService.hydrate(ctxB);
        expect(ctxA.memory.sharedFacts.owner.value).toBe('A');
        expect(ctxB.memory.sharedFacts.owner.value).toBe('B');
    });
    it('isolates facts by environment namespace within same tenant/workspace/project', async () => {
        const envA = {
            tenantId: 'tenant-A',
            workspaceId: 'ws-1',
            projectId: 'proj-1',
            environmentId: 'env-A',
            chainId: 'chain-1',
            runId: 'run-1',
        };
        const envB = {
            tenantId: 'tenant-A',
            workspaceId: 'ws-1',
            projectId: 'proj-1',
            environmentId: 'env-B',
            chainId: 'chain-1',
            runId: 'run-1',
        };
        await BlackboardService_1.BlackboardService.publishFact(envA, 'owner', { value: 'A' }, 'run');
        await BlackboardService_1.BlackboardService.publishFact(envB, 'owner', { value: 'B' }, 'run');
        const ctxA = { ...envA, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        const ctxB = { ...envB, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        await BlackboardService_1.BlackboardService.hydrate(ctxA);
        await BlackboardService_1.BlackboardService.hydrate(ctxB);
        expect(ctxA.memory.sharedFacts.owner.value).toBe('A');
        expect(ctxB.memory.sharedFacts.owner.value).toBe('B');
    });
});
