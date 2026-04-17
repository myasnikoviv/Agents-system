import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { SqliteEnvironmentStateStore, buildPersistedEnvironmentId } from '../../server/storage/EnvironmentStateStore';
import { EnvironmentSuspendResumeService } from '../../server/storage/EnvironmentSuspendResumeService';

describe('EnvironmentSuspendResumeService', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-suspend-resume-'));
  const dbPath = path.join(tmpDir, 'runtime.db');

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('suspends idle environment and resumes back to active', () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 't1', workspaceId: 'w1', projectId: 'p1' });
    const env = store.upsert({ environmentId, tenantId: 't1', workspaceId: 'w1', projectId: 'p1', state: 'idle' });
    const svc = new EnvironmentSuspendResumeService(store);

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
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 't2', workspaceId: 'w2', projectId: 'p2' });
    const env = store.upsert({ environmentId, tenantId: 't2', workspaceId: 'w2', projectId: 'p2', state: 'active' });
    const svc = new EnvironmentSuspendResumeService(store);

    const resumed = svc.resume({ environment: env, actorId: 'u2' });
    expect(resumed.ok).toBe(false);
    expect(resumed.error).toContain('invalid_transition');
    expect(resumed.environment.state).toBe('active');
    db.close();
  });

  it('terminates active environment', () => {
    const db = new Database(dbPath);
    const store = new SqliteEnvironmentStateStore(db);
    const environmentId = buildPersistedEnvironmentId({ tenantId: 't3', workspaceId: 'w3', projectId: 'p3' });
    const env = store.upsert({ environmentId, tenantId: 't3', workspaceId: 'w3', projectId: 'p3', state: 'active' });
    const svc = new EnvironmentSuspendResumeService(store);
    const terminated = svc.terminate({ environment: env, actorId: 'u3' });
    expect(terminated.ok).toBe(true);
    expect(terminated.to).toBe('terminated');
    expect(terminated.environment.state).toBe('terminated');
    db.close();
  });
});
