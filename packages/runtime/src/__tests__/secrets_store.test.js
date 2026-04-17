"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const SecretsStore_1 = require("../../server/storage/SecretsStore");
(0, globals_1.describe)('SqliteSecretsStore', () => {
    (0, globals_1.it)('stores encrypted secret and isolates by tenant/workspace', () => {
        const db = new better_sqlite3_1.default(':memory:');
        const store = new SecretsStore_1.SqliteSecretsStore(db, 'test-secret');
        const meta = store.upsert({
            tenantId: 'tenant-a',
            workspaceId: 'ws-a',
            userId: 'user-1',
            key: 'openhands.apiKeys.google',
            value: 'g-key-123',
            createdBy: 'user-1',
        });
        (0, globals_1.expect)(meta.key).toBe('openhands.apiKeys.google');
        const sameScopeValue = store.getValue({
            tenantId: 'tenant-a',
            workspaceId: 'ws-a',
            userId: 'user-1',
            key: 'openhands.apiKeys.google',
        });
        (0, globals_1.expect)(sameScopeValue).toBe('g-key-123');
        const otherScopeValue = store.getValue({
            tenantId: 'tenant-b',
            workspaceId: 'ws-a',
            userId: 'user-1',
            key: 'openhands.apiKeys.google',
        });
        (0, globals_1.expect)(otherScopeValue).toBeNull();
        const list = store.listMeta({ tenantId: 'tenant-a', workspaceId: 'ws-a', userId: 'user-1' });
        (0, globals_1.expect)(list.length).toBe(1);
        (0, globals_1.expect)(list[0]?.createdBy).toBe('user-1');
        (0, globals_1.expect)(list[0]?.userId).toBe('user-1');
        const crossUser = store.getValue({
            tenantId: 'tenant-a',
            workspaceId: 'ws-a',
            userId: 'user-2',
            key: 'openhands.apiKeys.google',
        });
        (0, globals_1.expect)(crossUser).toBeNull();
    });
    (0, globals_1.it)('supports manual rotation with version history', () => {
        const db = new better_sqlite3_1.default(':memory:');
        const store = new SecretsStore_1.SqliteSecretsStore(db, 'test-secret');
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
        (0, globals_1.expect)(rotated).toBeTruthy();
        (0, globals_1.expect)(rotated?.archivedVersion).toBe(1);
        const current = store.getValue({
            tenantId: 'tenant-a',
            workspaceId: 'ws-a',
            userId: 'user-1',
            key: 'openhands.apiKeys.google',
        });
        (0, globals_1.expect)(current).toBe('g-key-v2');
        const versions = store.listVersions({
            tenantId: 'tenant-a',
            workspaceId: 'ws-a',
            userId: 'user-1',
            key: 'openhands.apiKeys.google',
        });
        (0, globals_1.expect)(versions.length).toBe(1);
        (0, globals_1.expect)(versions[0]?.version).toBe(1);
    });
});
