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
      key: 'openhands.apiKeys.google',
      value: 'g-key-123',
      createdBy: 'user-1',
    });
    expect(meta.key).toBe('openhands.apiKeys.google');

    const sameScopeValue = store.getValue({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a',
      key: 'openhands.apiKeys.google',
    });
    expect(sameScopeValue).toBe('g-key-123');

    const otherScopeValue = store.getValue({
      tenantId: 'tenant-b',
      workspaceId: 'ws-a',
      key: 'openhands.apiKeys.google',
    });
    expect(otherScopeValue).toBeNull();

    const list = store.listMeta({ tenantId: 'tenant-a', workspaceId: 'ws-a' });
    expect(list.length).toBe(1);
    expect(list[0]?.createdBy).toBe('user-1');
  });
});
