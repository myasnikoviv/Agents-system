import { DynamicDiscoveryService } from '../DynamicDiscoveryService';
import { assetRegistryV2 } from '../registries/AssetRegistryV2';
import { closeRedisClient } from '../redisClient';
import { AgentRegistry } from '../registries/AgentRegistry';

describe('Discovery -> Registry Integration', () => {
  
  afterAll(async () => {
    await closeRedisClient();
  });

  it('should register found agents in the AssetStore during discovery', async () => {
    // Run discovery on the current workspace docs
    await DynamicDiscoveryService.discoverAll();

    // Check if agents were registered in memory (legacy)
    const legacyAgents = AgentRegistry.getAllAgents();
    expect(legacyAgents.length).toBeGreaterThan(0);

    // Check if they have assetIds assigned
    const sample = legacyAgents[0];
    expect(sample.assetId).toBeDefined();

    // Verify it exists in the persistent store
    const persistentAsset = await assetRegistryV2.getAsset(sample.assetId!);
    expect(persistentAsset).not.toBeNull();
    expect(persistentAsset?.identity.slug).toBe(sample.slug);
    
    console.log(`Verified integration: Found agent ${sample.name} with assetId ${sample.assetId}`);
  });
});
