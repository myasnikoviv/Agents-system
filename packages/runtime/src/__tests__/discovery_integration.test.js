"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamicDiscoveryService_1 = require("../DynamicDiscoveryService");
const AssetRegistryV2_1 = require("../registries/AssetRegistryV2");
const redisClient_1 = require("../redisClient");
const AgentRegistry_1 = require("../registries/AgentRegistry");
describe('Discovery -> Registry Integration', () => {
    afterAll(async () => {
        await (0, redisClient_1.closeRedisClient)();
    });
    it('should register found agents in the AssetStore during discovery', async () => {
        // Run discovery on the current workspace docs
        await DynamicDiscoveryService_1.DynamicDiscoveryService.discoverAll();
        // Check if agents were registered in memory (legacy)
        const legacyAgents = AgentRegistry_1.AgentRegistry.getAllAgents();
        expect(legacyAgents.length).toBeGreaterThan(0);
        // Check if they have assetIds assigned
        const sample = legacyAgents[0];
        expect(sample.assetId).toBeDefined();
        // Verify it exists in the persistent store
        const persistentAsset = await AssetRegistryV2_1.assetRegistryV2.getAsset(sample.assetId);
        expect(persistentAsset).not.toBeNull();
        expect(persistentAsset?.identity.slug).toBe(sample.slug);
        console.log(`Verified integration: Found agent ${sample.name} with assetId ${sample.assetId}`);
    });
});
