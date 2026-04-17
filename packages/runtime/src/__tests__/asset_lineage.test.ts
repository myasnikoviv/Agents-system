import { assetRegistryV2 } from '../registries/AssetRegistryV2';
import { closeRedisClient } from '../redisClient';

describe('Asset Promotion & Lineage Integration', () => {
  const originalSlug = 'source-agent';
  const forkSlug = 'forked-agent';

  afterAll(async () => {
    await closeRedisClient();
  });

  it('should promote an asset to a template and then fork it', async () => {
    // 1. Register Source Asset
    const sourceId = await assetRegistryV2.registerAsset({
      type: 'agent',
      slug: originalSlug,
      path: '/dev/source-agent.md',
      name: 'Source Agent',
      tenantId: 'dev-tenant',
      projectId: 'dev-proj'
    });

    // 2. Promote to Template
    const templateId = await assetRegistryV2.promote(sourceId);
    expect(templateId).toBeDefined();

    const templateAsset = await assetRegistryV2.getAsset(templateId);
    expect(templateAsset?.identity.project_id).toBe('system-templates');
    expect(templateAsset?.lineage.source_template_id).toBe(sourceId);
    expect(templateAsset?.attributes.original_type).toBe('agent');

    // 3. Fork from Template
    const forkId = await assetRegistryV2.fork(templateId, {
      tenantId: 'new-tenant',
      workspaceId: 'new-ws',
      projectId: 'new-proj',
      slug: forkSlug
    });

    // 4. Verify Fork
    const forkAsset = await assetRegistryV2.getAsset(forkId);
    expect(forkAsset).not.toBeNull();
    expect(forkAsset?.identity.asset_type).toBe('agent'); // Should restore original type
    expect(forkAsset?.identity.project_id).toBe('new-proj');
    expect(forkAsset?.lineage.source_template_id).toBe(templateId);
    expect(forkAsset?.lineage.customization_level).toBe('fork');
    
    console.log(`Verified Promotion & Lineage: 
      Source: ${sourceId} 
      Template: ${templateId} 
      Fork: ${forkId}`);
  });
});
