import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { SqliteEnvironmentStateStore } from '../../server/storage/EnvironmentStateStore';
import { EnvironmentProvisioningService } from '../../server/storage/EnvironmentProvisioningService';

describe('EnvironmentProvisioningService', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-provision-'));
  const dbPath = path.join(tmpDir, 'runtime.db');

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('provisions environment with progress steps and reaches active state', () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const svc = new EnvironmentProvisioningService(store);

    const result = svc.provisionOnDemand({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('provisioned');
    expect(result.environment.state).toBe('active');
    expect(result.steps.map((s) => s.state)).toEqual(['provisioning', 'warming', 'active']);
    db.close();
  });

  it('is idempotent when environment is already ready', () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const svc = new EnvironmentProvisioningService(store);

    const first = svc.provisionOnDemand({ tenantId: 'tenant-b', workspaceId: 'workspace-b', projectId: 'project-b' });
    expect(first.ok).toBe(true);

    const second = svc.provisionOnDemand({ tenantId: 'tenant-b', workspaceId: 'workspace-b', projectId: 'project-b' });
    expect(second.ok).toBe(true);
    expect(second.status).toBe('already_ready');
    expect(['active', 'warming', 'idle', 'suspended']).toContain(second.environment.state);
    db.close();
  });
});
