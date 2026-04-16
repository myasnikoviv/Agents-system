"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const EnvironmentStateStore_1 = require("../../server/storage/EnvironmentStateStore");
describe('SqliteEnvironmentStateStore', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'env-store-'));
    const dbPath = path_1.default.join(tmpDir, 'runtime.db');
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch { }
    });
    it('persists and reloads environment state across DB instances', () => {
        const db1 = new better_sqlite3_1.default(dbPath);
        const store1 = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db1);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
        store1.upsert({
            environmentId,
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            projectId: 'project-a',
            state: 'active',
        });
        db1.close();
        const db2 = new better_sqlite3_1.default(dbPath);
        const store2 = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db2);
        const restored = store2.get(environmentId);
        expect(restored).not.toBeNull();
        expect(restored?.state).toBe('active');
        expect(restored?.tenantId).toBe('tenant-a');
        expect(restored?.workspaceId).toBe('workspace-a');
        db2.close();
    });
    it('lists by tenant/workspace scope', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const envA = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-a' });
        const envB = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-b' });
        const envOther = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 'tenant-other', workspaceId: 'ws-1', projectId: 'p-z' });
        store.upsert({ environmentId: envA, tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-a', state: 'idle' });
        store.upsert({ environmentId: envB, tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-b', state: 'active' });
        store.upsert({ environmentId: envOther, tenantId: 'tenant-other', workspaceId: 'ws-1', projectId: 'p-z', state: 'active' });
        const scoped = store.listByScope({ tenantId: 'tenant-scope', workspaceId: 'ws-1' });
        expect(scoped.some((e) => e.environmentId === envA)).toBe(true);
        expect(scoped.some((e) => e.environmentId === envB)).toBe(true);
        expect(scoped.some((e) => e.environmentId === envOther)).toBe(false);
        db.close();
    });
});
