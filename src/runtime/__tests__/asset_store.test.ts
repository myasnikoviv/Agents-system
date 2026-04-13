import { RedisAssetStore } from '../registries/AssetStore';
import { ManagedAsset } from '../registries/AssetDomainModel';
import { closeRedisClient } from '../redisClient';

describe('RedisAssetStore Integration', () => {
  const store = new RedisAssetStore();
  const testAssetId = 'test-asset-id';
  const testAsset: ManagedAsset = {
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
    await closeRedisClient();
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
