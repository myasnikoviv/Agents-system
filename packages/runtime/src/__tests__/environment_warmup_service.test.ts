import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { SqliteEnvironmentStateStore, buildPersistedEnvironmentId } from '../../server/storage/EnvironmentStateStore';
import { EnvironmentWarmupService } from '../../server/storage/EnvironmentWarmupService';

describe('EnvironmentWarmupService', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-warmup-'));
  const dbPath = path.join(tmpDir, 'runtime.db');

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('sets environment to active when checks pass', async () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 't1', workspaceId: 'w1', projectId: 'p1' });
    const env = store.upsert({ environmentId, tenantId: 't1', workspaceId: 'w1', projectId: 'p1', state: 'idle' });

    const svc = new EnvironmentWarmupService(store);
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
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 't2', workspaceId: 'w2', projectId: 'p2' });
    const env = store.upsert({ environmentId, tenantId: 't2', workspaceId: 'w2', projectId: 'p2', state: 'idle' });

    const svc = new EnvironmentWarmupService(store);
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
