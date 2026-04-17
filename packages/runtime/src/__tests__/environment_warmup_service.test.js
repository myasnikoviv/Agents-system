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
const EnvironmentWarmupService_1 = require("../../server/storage/EnvironmentWarmupService");
describe('EnvironmentWarmupService', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'env-warmup-'));
    const dbPath = path_1.default.join(tmpDir, 'runtime.db');
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch { }
    });
    it('sets environment to active when checks pass', async () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 't1', workspaceId: 'w1', projectId: 'p1' });
        const env = store.upsert({ environmentId, tenantId: 't1', workspaceId: 'w1', projectId: 'p1', state: 'idle' });
        const svc = new EnvironmentWarmupService_1.EnvironmentWarmupService(store);
        const result = await svc.warmup({
            environment: env,
            runChecks: async () => [
                { id: 'catalog_refresh', ok: true },
                { id: 'executor_config', ok: true },
            ],
        });
        expect(result.ok).toBe(true);
        expect(result.environment.state).toBe('active');
        expect(result.checks.length).toBe(2);
        db.close();
    });
    it('sets environment to failed when a check fails', async () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 't2', workspaceId: 'w2', projectId: 'p2' });
        const env = store.upsert({ environmentId, tenantId: 't2', workspaceId: 'w2', projectId: 'p2', state: 'idle' });
        const svc = new EnvironmentWarmupService_1.EnvironmentWarmupService(store);
        const result = await svc.warmup({
            environment: env,
            runChecks: async () => [
                { id: 'catalog_refresh', ok: false, detail: 'catalog_unavailable' },
            ],
        });
        expect(result.ok).toBe(false);
        expect(result.environment.state).toBe('failed');
        expect(result.error).toContain('catalog_unavailable');
        db.close();
    });
});
