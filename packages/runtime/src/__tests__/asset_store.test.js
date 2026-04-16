"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetStore_1 = require("../registries/AssetStore");
const redisClient_1 = require("../redisClient");
describe('RedisAssetStore Integration', () => {
    const store = new AssetStore_1.RedisAssetStore();
    const testAssetId = 'test-asset-id';
    const testAsset = {
        identity: {
            asset_id: testAssetId,
            asset_type: 'agent',
            slug: 'test-agent',
            tenant_id: 't1',
            workspace_id: 'w1',
            project_id: 'p1'
        },
        lineage: {
            customization_level: 'original'
        },
        metadata: {
            name: 'Test Agent',
            version: '1.0.0',
            status: 'active',
            approval_state: 'approved',
            storage_ref: '/path/to/test'
        },
        attributes: {}
    };
    afterAll(async () => {
        await store.delete(testAssetId);
        await (0, redisClient_1.closeRedisClient)();
    });
    it('should save and retrieve an asset', async () => {
        await store.save(testAsset);
        const retrieved = await store.get(testAssetId);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.identity.slug).toBe('test-agent');
        expect(retrieved?.metadata.status).toBe('active');
    });
    it('should list assets by type', async () => {
        const list = await store.listByType('agent');
        const ids = list.map(a => a.identity.asset_id);
        expect(ids).toContain(testAssetId);
    });
    it('should list assets by project', async () => {
        const list = await store.listByProject('p1');
        const ids = list.map(a => a.identity.asset_id);
        expect(ids).toContain(testAssetId);
    });
    it('should delete an asset and its indices', async () => {
        await store.delete(testAssetId);
        const retrieved = await store.get(testAssetId);
        expect(retrieved).toBeNull();
        const typeList = await store.listByType('agent');
        expect(typeList.find(a => a.identity.asset_id === testAssetId)).toBeUndefined();
    });
});
