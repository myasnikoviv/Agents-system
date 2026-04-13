import { assetRegistryV2 } from '../registries/AssetRegistryV2';
import { assetStore } from '../registries/AssetStore';
import { closeRedisClient } from '../redisClient';

describe('AssetRegistryV2', () => {
  const testSlug = 'test-service-agent';

  afterAll(async () => {
    // Cleanup is handled by store tests primarily, but we close redis here
    await closeRedisClient();
  });

  it('should register an asset and return a deterministic ID', async () => {
    const assetId = await assetRegistryV2.registerAsset({
      type: 'agent',
      slug: testSlug,
      path: '/docs/agents/test.md',
      name: 'Test Service Agent',
      tenantId: 'cust1',
      projectId: 'proj1'
    });

    expect(assetId).toBeDefined();
    expect(assetId.length).toBe(16);

    const asset = await assetRegistryV2.getAsset(assetId);
    expect(asset).not.toBeNull();
    expect(asset?.identity.slug).toBe(testSlug);
    expect(asset?.identity.project_id).toBe('proj1');
    expect(asset?.metadata.name).toBe('Test Service Agent');
  });

  it('should list assets by type', async () => {
     const agents = await assetRegistryV2.listByType('agent');
     expect(agents.length).toBeGreaterThan(0);
     expect(agents.find(a => a.identity.slug === testSlug)).toBeDefined();
  });
});
