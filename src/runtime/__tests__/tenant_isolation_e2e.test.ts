import { describe, expect, it, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { resolveTenantScope, tenantNamespace } from '../tenancy/TenantContext';
import { SqliteSecretsStore } from '../../server/storage/SecretsStore';
import { SqliteObjectStorageService } from '../../server/storage/ObjectStorageService';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';

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

describe('Sprint25 AGSYS-2514 tenant isolation', () => {
  beforeEach(() => {
    store.clear();
    hashStore.clear();
    listStore.clear();
    ProjectDispatchQueue.clearProject('tenant-a-project');
    ProjectDispatchQueue.clearProject('tenant-b-project');
  });

  it('keeps tenant-scoped memory, queue, secrets, and artifacts isolated', async () => {
    const tenantA = resolveTenantScope({
      tenantId: 'tenant-a',
      workspaceId: 'workspace-1',
      projectId: 'shared-project',
      runId: 'run-1',
    });
    const tenantB = resolveTenantScope({
      tenantId: 'tenant-b',
      workspaceId: 'workspace-1',
      projectId: 'shared-project',
      runId: 'run-1',
    });

    expect(tenantNamespace(tenantA, 'memory')).not.toBe(tenantNamespace(tenantB, 'memory'));
    expect(tenantNamespace(tenantA, 'queue')).not.toBe(tenantNamespace(tenantB, 'queue'));

    await BlackboardService.publishFact({ ...tenantA, chainId: 'c1' } as any, 'owner', { value: 'A' }, 'run');
    await BlackboardService.publishFact({ ...tenantB, chainId: 'c1' } as any, 'owner', { value: 'B' }, 'run');
    const ctxA: any = { ...tenantA, chainId: 'c1', artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
    const ctxB: any = { ...tenantB, chainId: 'c1', artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
    await BlackboardService.hydrate(ctxA);
    await BlackboardService.hydrate(ctxB);
    expect(ctxA.memory.sharedFacts.owner.value).toBe('A');
    expect(ctxB.memory.sharedFacts.owner.value).toBe('B');

    ProjectDispatchQueue.enqueue({
      runId: 'ra',
      projectId: 'tenant-a-project',
      chainId: 'ca',
      pipelineId: 'unified-task-intake',
      stageId: 'dev',
      agentSlug: 'developer',
      payload: { tenantId: 'tenant-a' },
    });
    ProjectDispatchQueue.enqueue({
      runId: 'rb',
      projectId: 'tenant-b-project',
      chainId: 'cb',
      pipelineId: 'unified-task-intake',
      stageId: 'dev',
      agentSlug: 'developer',
      payload: { tenantId: 'tenant-b' },
    });
    const pickA = ProjectDispatchQueue.pickup('tenant-a-project', 'developer');
    const pickB = ProjectDispatchQueue.pickup('tenant-b-project', 'developer');
    expect((pickA?.payload as any)?.tenantId).toBe('tenant-a');
    expect((pickB?.payload as any)?.tenantId).toBe('tenant-b');

    const db = new Database(':memory:');
    const secrets = new SqliteSecretsStore(db, 'secret-key');
    secrets.upsert({
      tenantId: 'tenant-a',
      workspaceId: 'workspace-1',
      key: 'openhands.apiKeys.google',
      value: 'A_KEY',
    });
    secrets.upsert({
      tenantId: 'tenant-b',
      workspaceId: 'workspace-1',
      key: 'openhands.apiKeys.google',
      value: 'B_KEY',
    });
    expect(secrets.getValue({ tenantId: 'tenant-a', workspaceId: 'workspace-1', key: 'openhands.apiKeys.google' })).toBe('A_KEY');
    expect(secrets.getValue({ tenantId: 'tenant-b', workspaceId: 'workspace-1', key: 'openhands.apiKeys.google' })).toBe('B_KEY');

    const objectStorage = new SqliteObjectStorageService(db);
    objectStorage.putObject({
      bucket: 'attachments',
      key: 'tenant-a/item.txt',
      projectId: 'tenant-a-project',
      threadId: 'thread-a',
      contentBase64: Buffer.from('A').toString('base64'),
      metadata: { tenantId: 'tenant-a' },
    });
    objectStorage.putObject({
      bucket: 'attachments',
      key: 'tenant-b/item.txt',
      projectId: 'tenant-b-project',
      threadId: 'thread-b',
      contentBase64: Buffer.from('B').toString('base64'),
      metadata: { tenantId: 'tenant-b' },
    });
    const listA = objectStorage.listObjects({ bucket: 'attachments', projectId: 'tenant-a-project' });
    const listB = objectStorage.listObjects({ bucket: 'attachments', projectId: 'tenant-b-project' });
    expect(listA.length).toBe(1);
    expect(listB.length).toBe(1);
    expect(listA[0]?.metadata?.tenantId).toBe('tenant-a');
    expect(listB[0]?.metadata?.tenantId).toBe('tenant-b');
  });
});
