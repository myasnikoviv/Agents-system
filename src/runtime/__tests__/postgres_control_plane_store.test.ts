import { PostgresControlPlaneStore } from '../../server/storage/PostgresControlPlaneStore';

describe('PostgresControlPlaneStore', () => {
  const originalPostgresUrl = process.env.POSTGRES_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (originalPostgresUrl) process.env.POSTGRES_URL = originalPostgresUrl;
    else delete process.env.POSTGRES_URL;
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it('stays disabled and no-ops writes when postgres url is not configured', async () => {
    const store = new PostgresControlPlaneStore();
    await store.init();
    const health = await store.health();
    expect(store.isEnabled()).toBe(false);
    expect(health.enabled).toBe(false);
    expect(await store.upsertState('k', { a: 1 })).toBe(false);
    expect(await store.upsertSetting('s', { b: 2 })).toBe(false);
    expect(await store.getState('k')).toBeNull();
    expect(await store.getSetting('s')).toBeNull();
    expect(await store.listSettings()).toEqual([]);
    expect(await store.recordPolicyMetadata({ eventKind: 'rule_update', entityId: 'r1' })).toBe(false);
    expect(await store.recordAuditAction({ action: 'x' })).toBe(false);
  });
});
