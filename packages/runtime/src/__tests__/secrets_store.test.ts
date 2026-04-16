import { describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { SqliteSecretsStore } from '../../server/storage/SecretsStore';

describe('SqliteSecretsStore', () => {
  it('stores encrypted secret and isolates by tenant/workspace', () => {
    const db = new Database(':memory:');
    const store = new SqliteSecretsStore(db, 'test-secret');

    const meta = store.upsert({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
      value: 'g-key-123',
      createdBy: 'user-1',
    });
    expect(meta.key).toBe('openhands.apiKeys.google');

    const sameScopeValue = store.getValue({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
    });
    expect(sameScopeValue).toBe('g-key-123');

    const otherScopeValue = store.getValue({
      tenantId: 'tenant-b',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
    });
    expect(otherScopeValue).toBeNull();

    const list = store.listMeta({ tenantId: 'tenant-a', workspaceId: 'ws-a', userId: 'user-1' });
    expect(list.length).toBe(1);
    expect(list[0]?.createdBy).toBe('user-1');
    expect(list[0]?.userId).toBe('user-1');

    const crossUser = store.getValue({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-2',
      key: 'openhands.apiKeys.google',
    });
    expect(crossUser).toBeNull();
  });

  it('supports manual rotation with version history', () => {
    const db = new Database(':memory:');
    const store = new SqliteSecretsStore(db, 'test-secret');

    store.upsert({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
      value: 'g-key-v1',
      createdBy: 'user-1',
    });

    const rotated = store.rotate({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
      value: 'g-key-v2',
      rotatedBy: 'user-1',
    });
    expect(rotated).toBeTruthy();
    expect(rotated?.archivedVersion).toBe(1);

    const current = store.getValue({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
    });
    expect(current).toBe('g-key-v2');

    const versions = store.listVersions({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      userId: 'user-1',
      key: 'openhands.apiKeys.google',
    });
    expect(versions.length).toBe(1);
    expect(versions[0]?.version).toBe(1);
  });
});
