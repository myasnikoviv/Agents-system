import fs from 'fs';
import os from 'os';
import path from 'path';
import { InMemoryServiceStateStore, SqliteServiceStateStore } from '../control-api/ServiceStateStore';

describe('ServiceStateStore (AGSYS-2704)', () => {
  it('stores and retrieves state in memory', () => {
    const store = new InMemoryServiceStateStore();
    store.upsert({
      serviceId: 'backend',
      desired: 'running',
      status: 'healthy',
      restartCount: 1,
      lastCheckAt: '2026-04-09T00:00:00.000Z',
      errorReason: null,
    });

    const row = store.get('backend');
    expect(row?.status).toBe('healthy');
    expect(row?.restartCount).toBe(1);
    expect(store.list().length).toBe(1);
  });

  it('persists and restores state via sqlite store', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-api-state-'));
    const dbPath = path.join(tmpDir, 'state.db');

    const storeA = new SqliteServiceStateStore(dbPath);
    storeA.upsert({
      serviceId: 'runtime-dispatcher',
      desired: 'running',
      status: 'failed',
      restartCount: 3,
      lastCheckAt: '2026-04-09T00:00:01.000Z',
      errorReason: 'timeout',
    });

    const storeB = new SqliteServiceStateStore(dbPath);
    const restored = storeB.get('runtime-dispatcher');

    expect(restored?.status).toBe('failed');
    expect(restored?.restartCount).toBe(3);
    expect(restored?.errorReason).toBe('timeout');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
