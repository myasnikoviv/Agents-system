"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const TenantContext_1 = require("../tenancy/TenantContext");
const SecretsStore_1 = require("../../server/storage/SecretsStore");
const ObjectStorageService_1 = require("../../server/storage/ObjectStorageService");
const ProjectDispatchQueue_1 = require("../queue/ProjectDispatchQueue");
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
(0, globals_1.describe)('Sprint25 AGSYS-2514 tenant isolation', () => {
    (0, globals_1.beforeEach)(() => {
        store.clear();
        hashStore.clear();
        listStore.clear();
        ProjectDispatchQueue_1.ProjectDispatchQueue.clearProject('tenant-a-project');
        ProjectDispatchQueue_1.ProjectDispatchQueue.clearProject('tenant-b-project');
    });
    (0, globals_1.it)('keeps tenant-scoped memory, queue, secrets, and artifacts isolated', async () => {
        const tenantA = (0, TenantContext_1.resolveTenantScope)({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-1',
            projectId: 'shared-project',
            runId: 'run-1',
        });
        const tenantB = (0, TenantContext_1.resolveTenantScope)({
            tenantId: 'tenant-b',
            workspaceId: 'workspace-1',
            projectId: 'shared-project',
            runId: 'run-1',
        });
        (0, globals_1.expect)((0, TenantContext_1.tenantNamespace)(tenantA, 'memory')).not.toBe((0, TenantContext_1.tenantNamespace)(tenantB, 'memory'));
        (0, globals_1.expect)((0, TenantContext_1.tenantNamespace)(tenantA, 'queue')).not.toBe((0, TenantContext_1.tenantNamespace)(tenantB, 'queue'));
        await BlackboardService_1.BlackboardService.publishFact({ ...tenantA, chainId: 'c1' }, 'owner', { value: 'A' }, 'run');
        await BlackboardService_1.BlackboardService.publishFact({ ...tenantB, chainId: 'c1' }, 'owner', { value: 'B' }, 'run');
        const ctxA = { ...tenantA, chainId: 'c1', artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        const ctxB = { ...tenantB, chainId: 'c1', artifacts: { priorOutputs: [] }, memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] } };
        await BlackboardService_1.BlackboardService.hydrate(ctxA);
        await BlackboardService_1.BlackboardService.hydrate(ctxB);
        (0, globals_1.expect)(ctxA.memory.sharedFacts.owner.value).toBe('A');
        (0, globals_1.expect)(ctxB.memory.sharedFacts.owner.value).toBe('B');
        ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'ra',
            projectId: 'tenant-a-project',
            chainId: 'ca',
            pipelineId: 'unified-task-intake',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { tenantId: 'tenant-a' },
        });
        ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'rb',
            projectId: 'tenant-b-project',
            chainId: 'cb',
            pipelineId: 'unified-task-intake',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { tenantId: 'tenant-b' },
        });
        const pickA = ProjectDispatchQueue_1.ProjectDispatchQueue.pickup('tenant-a-project', 'developer');
        const pickB = ProjectDispatchQueue_1.ProjectDispatchQueue.pickup('tenant-b-project', 'developer');
        (0, globals_1.expect)(pickA?.payload?.tenantId).toBe('tenant-a');
        (0, globals_1.expect)(pickB?.payload?.tenantId).toBe('tenant-b');
        const db = new better_sqlite3_1.default(':memory:');
        const secrets = new SecretsStore_1.SqliteSecretsStore(db, 'secret-key');
        secrets.upsert({
            tenantId: 'tenant-a',
            workspaceId: 'workspace-1',
            userId: 'user-a',
            key: 'openhands.apiKeys.google',
            value: 'A_KEY',
        });
        secrets.upsert({
            tenantId: 'tenant-b',
            workspaceId: 'workspace-1',
            userId: 'user-b',
            key: 'openhands.apiKeys.google',
            value: 'B_KEY',
        });
        (0, globals_1.expect)(secrets.getValue({ tenantId: 'tenant-a', workspaceId: 'workspace-1', userId: 'user-a', key: 'openhands.apiKeys.google' })).toBe('A_KEY');
        (0, globals_1.expect)(secrets.getValue({ tenantId: 'tenant-b', workspaceId: 'workspace-1', userId: 'user-b', key: 'openhands.apiKeys.google' })).toBe('B_KEY');
        (0, globals_1.expect)(secrets.getValue({ tenantId: 'tenant-a', workspaceId: 'workspace-1', userId: 'user-b', key: 'openhands.apiKeys.google' })).toBeNull();
        const objectStorage = new ObjectStorageService_1.SqliteObjectStorageService(db);
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
        (0, globals_1.expect)(listA.length).toBe(1);
        (0, globals_1.expect)(listB.length).toBe(1);
        (0, globals_1.expect)(listA[0]?.metadata?.tenantId).toBe('tenant-a');
        (0, globals_1.expect)(listB[0]?.metadata?.tenantId).toBe('tenant-b');
    });
});
