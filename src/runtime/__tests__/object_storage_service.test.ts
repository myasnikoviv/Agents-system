import { describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { SqliteObjectStorageService } from '../../server/storage/ObjectStorageService';

describe('SqliteObjectStorageService', () => {
  it('stores, lists and retrieves object payloads', () => {
    const db = new Database(':memory:');
    const storage = new SqliteObjectStorageService(db);
    const contentBase64 = Buffer.from('hello-object-storage', 'utf-8').toString('base64');
    const saved = storage.putObject({
      bucket: 'attachments',
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      key: 'agent_system/thread-1/sample.txt',
      projectId: 'agent_system',
      threadId: 'thread-1',
      mimeType: 'text/plain',
      contentBase64,
      metadata: { originalName: 'sample.txt' },
    });

    expect(saved.id).toMatch(/^obj-/);
    expect(saved.size).toBeGreaterThan(0);
    expect(saved.bucket).toBe('attachments');

    const listed = storage.listObjects({
      bucket: 'attachments',
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      projectId: 'agent_system',
      threadId: 'thread-1',
      limit: 10,
    });
    expect(listed.length).toBe(1);
    expect(listed[0]?.id).toBe(saved.id);

    const fetched = storage.getObject(saved.id, { tenantId: 'tenant-a', workspaceId: 'workspace-a' });
    expect(fetched).toBeTruthy();
    expect(fetched?.contentBase64).toBe(contentBase64);
    expect(fetched?.metadata?.originalName).toBe('sample.txt');
  });

  it('enforces tenant/workspace scoped reads', () => {
    const db = new Database(':memory:');
    const storage = new SqliteObjectStorageService(db);
    const saved = storage.putObject({
      bucket: 'attachments',
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      key: 'agent_system/thread-1/private.txt',
      projectId: 'agent_system',
      threadId: 'thread-1',
      mimeType: 'text/plain',
      contentBase64: Buffer.from('private', 'utf-8').toString('base64'),
    });

    const sameScope = storage.getObject(saved.id, { tenantId: 'tenant-a', workspaceId: 'workspace-a' });
    const otherScope = storage.getObject(saved.id, { tenantId: 'tenant-b', workspaceId: 'workspace-b' });
    expect(sameScope).toBeTruthy();
    expect(otherScope).toBeNull();
  });
});
