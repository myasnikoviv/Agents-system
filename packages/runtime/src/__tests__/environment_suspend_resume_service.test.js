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
const EnvironmentSuspendResumeService_1 = require("../../server/storage/EnvironmentSuspendResumeService");
describe('EnvironmentSuspendResumeService', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'env-suspend-resume-'));
    const dbPath = path_1.default.join(tmpDir, 'runtime.db');
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch { }
    });
    it('suspends idle environment and resumes back to active', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 't1', workspaceId: 'w1', projectId: 'p1' });
        const env = store.upsert({ environmentId, tenantId: 't1', workspaceId: 'w1', projectId: 'p1', state: 'idle' });
        const svc = new EnvironmentSuspendResumeService_1.EnvironmentSuspendResumeService(store);
        const suspended = svc.suspend({ environment: env, actorId: 'u1' });
        expect(suspended.ok).toBe(true);
        expect(suspended.from).toBe('idle');
        expect(suspended.to).toBe('suspended');
        expect(suspended.environment.state).toBe('suspended');
        const resumed = svc.resume({ environment: suspended.environment, actorId: 'u1' });
        expect(resumed.ok).toBe(true);
        expect(resumed.from).toBe('suspended');
        expect(resumed.to).toBe('active');
        expect(resumed.environment.state).toBe('active');
        db.close();
    });
    it('rejects invalid transition for already active environment on resume', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 't2', workspaceId: 'w2', projectId: 'p2' });
        const env = store.upsert({ environmentId, tenantId: 't2', workspaceId: 'w2', projectId: 'p2', state: 'active' });
        const svc = new EnvironmentSuspendResumeService_1.EnvironmentSuspendResumeService(store);
        const resumed = svc.resume({ environment: env, actorId: 'u2' });
        expect(resumed.ok).toBe(false);
        expect(resumed.error).toContain('invalid_transition');
        expect(resumed.environment.state).toBe('active');
        db.close();
    });
    it('terminates active environment', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const environmentId = (0, EnvironmentStateStore_1.buildPersistedEnvironmentId)({ tenantId: 't3', workspaceId: 'w3', projectId: 'p3' });
        const env = store.upsert({ environmentId, tenantId: 't3', workspaceId: 'w3', projectId: 'p3', state: 'active' });
        const svc = new EnvironmentSuspendResumeService_1.EnvironmentSuspendResumeService(store);
        const terminated = svc.terminate({ environment: env, actorId: 'u3' });
        expect(terminated.ok).toBe(true);
        expect(terminated.to).toBe('terminated');
        expect(terminated.environment.state).toBe('terminated');
        db.close();
    });
});
