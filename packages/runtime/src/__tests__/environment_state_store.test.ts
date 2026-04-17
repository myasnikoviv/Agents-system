import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { SqliteEnvironmentStateStore, buildPersistedEnvironmentId } from '../../server/storage/EnvironmentStateStore';

describe('SqliteEnvironmentStateStore', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-store-'));
  const dbPath = path.join(tmpDir, 'runtime.db');

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('persists and reloads environment state across DB instances', () => {
    const db1 = new Database(dbPath);
    const store1 = new SqliteEnvironmentStateStore(db1);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
    store1.upsert({
      environmentId,
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      projectId: 'project-a',
      state: 'active',
    });
    db1.close();

    const db2 = new Database(dbPath);
    const store2 = new SqliteEnvironmentStateStore(db2);
    const restored = store2.get(environmentId);
    expect(restored).not.toBeNull();
    expect(restored?.state).toBe('active');
    expect(restored?.tenantId).toBe('tenant-a');
    expect(restored?.workspaceId).toBe('workspace-a');
    db2.close();
  });

  it('lists by tenant/workspace scope', () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const envA = buildPersistedEnvironmentId({ tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-a' });
    const envB = buildPersistedEnvironmentId({ tenantId: 'tenant-scope', workspaceId: 'ws-1', projectId: 'p-b' });
    const envOther = buildPersistedEnvironmentId({ tenantId: 'tenant-other', workspaceId: 'ws-1', projectId: 'p-z' });

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
