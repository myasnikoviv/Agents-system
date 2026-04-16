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
const EnvironmentProvisioningService_1 = require("../../server/storage/EnvironmentProvisioningService");
describe('EnvironmentProvisioningService', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'env-provision-'));
    const dbPath = path_1.default.join(tmpDir, 'runtime.db');
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch { }
    });
    it('provisions environment with progress steps and reaches active state', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const svc = new EnvironmentProvisioningService_1.EnvironmentProvisioningService(store);
        const result = svc.provisionOnDemand({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
        expect(result.ok).toBe(true);
        expect(result.status).toBe('provisioned');
        expect(result.environment.state).toBe('active');
        expect(result.steps.map((s) => s.state)).toEqual(['provisioning', 'warming', 'active']);
        db.close();
    });
    it('is idempotent when environment is already ready', () => {
        const db = new better_sqlite3_1.default(dbPath);
        const store = new EnvironmentStateStore_1.SqliteEnvironmentStateStore(db);
        const svc = new EnvironmentProvisioningService_1.EnvironmentProvisioningService(store);
        const first = svc.provisionOnDemand({ tenantId: 'tenant-b', workspaceId: 'workspace-b', projectId: 'project-b' });
        expect(first.ok).toBe(true);
        const second = svc.provisionOnDemand({ tenantId: 'tenant-b', workspaceId: 'workspace-b', projectId: 'project-b' });
        expect(second.ok).toBe(true);
        expect(second.status).toBe('already_ready');
        expect(['active', 'warming', 'idle', 'suspended']).toContain(second.environment.state);
        db.close();
    });
});
