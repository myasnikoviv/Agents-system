const store = new Map<string, string>();
const hashStore = new Map<string, Map<string, string>>();
const listStore = new Map<string, string[]>();

jest.mock('../redisClient', () => ({
  getRedisClient: () => ({
    async lrange(key: string, start: number, end: number) {
      const list = listStore.get(key) || [];
      const from = Math.max(0, start);
      const to = end < 0 ? list.length : end + 1;
      return list.slice(from, to);
    },
    async rpush(key: string, value: string) {
      const list = listStore.get(key) || [];
      list.push(value);
      listStore.set(key, list);
      return list.length;
    },
    async hgetall(key: string) {
      const m = hashStore.get(key) || new Map<string, string>();
      return Object.fromEntries(m.entries());
    },
    async hset(key: string, field: string, value: string) {
      const m = hashStore.get(key) || new Map<string, string>();
      m.set(field, value);
      hashStore.set(key, m);
      return 1;
    },
    async get(key: string) {
      return store.get(key) || null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
      return 'OK';
    },
  }),
}));

import { BlackboardService } from '../BlackboardService';

describe('BlackboardService tenant/workspace scoping', () => {
  beforeEach(() => {
    store.clear();
    hashStore.clear();
    listStore.clear();
  });

  it('isolates facts by tenant namespace even with same project/chain/run ids', async () => {
    const sharedPathA = { tenantId: 'tenant-A', workspaceId: 'ws-1', projectId: 'proj-1', chainId: 'chain-1', runId: 'run-1' };
    const sharedPathB = { tenantId: 'tenant-B', workspaceId: 'ws-1', projectId: 'proj-1', chainId: 'chain-1', runId: 'run-1' };

    await BlackboardService.publishFact(sharedPathA, 'owner', { value: 'A' }, 'run');
    await BlackboardService.publishFact(sharedPathB, 'owner', { value: 'B' }, 'run');

    const ctxA: any = { ...sharedPathA, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
    const ctxB: any = { ...sharedPathB, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };

    await BlackboardService.hydrate(ctxA);
    await BlackboardService.hydrate(ctxB);

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

    await BlackboardService.publishFact(envA, 'owner', { value: 'A' }, 'run');
    await BlackboardService.publishFact(envB, 'owner', { value: 'B' }, 'run');

    const ctxA: any = { ...envA, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
    const ctxB: any = { ...envB, artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };

    await BlackboardService.hydrate(ctxA);
    await BlackboardService.hydrate(ctxB);

    expect(ctxA.memory.sharedFacts.owner.value).toBe('A');
    expect(ctxB.memory.sharedFacts.owner.value).toBe('B');
  });
});
