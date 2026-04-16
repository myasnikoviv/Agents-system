"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const ObjectStorageService_1 = require("../../server/storage/ObjectStorageService");
(0, globals_1.describe)('SqliteObjectStorageService', () => {
    (0, globals_1.it)('stores, lists and retrieves object payloads', () => {
        const db = new better_sqlite3_1.default(':memory:');
        const storage = new ObjectStorageService_1.SqliteObjectStorageService(db);
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
        (0, globals_1.expect)(saved.id).toMatch(/^obj-/);
        (0, globals_1.expect)(saved.size).toBeGreaterThan(0);
        (0, globals_1.expect)(saved.bucket).toBe('attachments');
        const listed = storage.listObjects({
            bucket: 'attachments',
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            projectId: 'agent_system',
            threadId: 'thread-1',
            limit: 10,
        });
        (0, globals_1.expect)(listed.length).toBe(1);
        (0, globals_1.expect)(listed[0]?.id).toBe(saved.id);
        const fetched = storage.getObject(saved.id, { tenantId: 'tenant-a', workspaceId: 'workspace-a' });
        (0, globals_1.expect)(fetched).toBeTruthy();
        (0, globals_1.expect)(fetched?.contentBase64).toBe(contentBase64);
        (0, globals_1.expect)(fetched?.metadata?.originalName).toBe('sample.txt');
    });
    (0, globals_1.it)('enforces tenant/workspace scoped reads', () => {
        const db = new better_sqlite3_1.default(':memory:');
        const storage = new ObjectStorageService_1.SqliteObjectStorageService(db);
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
        (0, globals_1.expect)(sameScope).toBeTruthy();
        (0, globals_1.expect)(otherScope).toBeNull();
    });
});
