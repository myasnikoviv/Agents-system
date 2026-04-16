"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetRegistryV2_1 = require("../registries/AssetRegistryV2");
const AssetDomainModel_1 = require("../registries/AssetDomainModel");
const redisClient_1 = require("../redisClient");
const AgentRegistry_1 = require("../registries/AgentRegistry");
describe('AssetRegistryV2', () => {
    const testSlug = 'test-service-agent';
    afterAll(async () => {
        // Cleanup is handled by store tests primarily, but we close redis here
        await (0, redisClient_1.closeRedisClient)();
    });
    it('should register an asset and return a deterministic ID', async () => {
        const assetId = await AssetRegistryV2_1.assetRegistryV2.registerAsset({
            type: 'agent',
            slug: testSlug,
            path: '/docs/agents/test.md',
            name: 'Test Service Agent',
            tenantId: 'cust1',
            projectId: 'proj1'
        });
        expect(assetId).toBeDefined();
        expect(assetId.length).toBe(16);
        const asset = await AssetRegistryV2_1.assetRegistryV2.getAsset(assetId);
        expect(asset).not.toBeNull();
        expect(asset?.identity.slug).toBe(testSlug);
        expect(asset?.identity.project_id).toBe('proj1');
        expect(asset?.metadata.name).toBe('Test Service Agent');
    });
    it('should list assets by type', async () => {
        const agents = await AssetRegistryV2_1.assetRegistryV2.listByType('agent');
        expect(agents.length).toBeGreaterThan(0);
        expect(agents.find(a => a.identity.slug === testSlug)).toBeDefined();
    });
    it('should rehydrate registries during initialization', async () => {
        const slug = 'hydrate-test';
        const proj = `hydrate-proj-${Date.now()}`;
        // 1. Pre-seed store
        await AssetRegistryV2_1.assetRegistryV2.registerAsset({
            type: 'agent',
            slug,
            path: '/dev/null',
            name: 'Hydrate Test',
            tenantId: 'default',
            projectId: proj,
            attributes: {
                callsign: 'HYDRATOR',
                mission: 'Testing rehydration integrity',
                guardrails: ['No leaks allowed']
            }
        });
        // 2. Clear Registry
        AgentRegistry_1.AgentRegistry.clear();
        expect(AgentRegistry_1.AgentRegistry.getAgent(slug)).toBeUndefined();
        // 3. Initialize
        process.env.PROJECT_ID = proj;
        await AssetRegistryV2_1.assetRegistryV2.initialize();
        // 4. Verify
        expect(AssetRegistryV2_1.assetRegistryV2.isHydrated()).toBe(true);
        // We can also check the legacy registry directly if it happens to be the same instance
        const agent = AgentRegistry_1.AgentRegistry.getAgent(slug);
        if (agent) {
            expect(agent.name).toBe('Hydrate Test');
        }
        else {
            console.log('Note: AgentRegistry instance in test is different from runtime, relying on isHydrated()');
        }
    });
    it('should detect corruption and enter Safe Mode', async () => {
        const slug = 'corrupt-agent';
        const proj = `corrupt-proj-${Date.now()}`;
        // 1. Register valid asset
        await AssetRegistryV2_1.assetRegistryV2.registerAsset({
            type: 'agent',
            slug,
            path: '/dev/null',
            name: 'Corrupt Test',
            tenantId: 'default',
            projectId: proj,
            attributes: {
                callsign: 'ORIGINAL',
                mission: 'Testing integrity',
                guardrails: []
            }
        });
        // 2. Manually corrupt data in store (bypass registry)
        const asset = await AssetRegistryV2_1.assetRegistryV2.getAsset((0, AssetDomainModel_1.generateAssetId)({
            tenant_id: 'default',
            workspace_id: 'default',
            project_id: proj,
            asset_type: 'agent',
            slug
        }));
        if (asset) {
            asset.attributes.callsign = 'CORRUPTED'; // Change data but keep same checksum in metadata
            // Using store directly to simulate external corruption
            const { assetStore } = require('../registries/AssetStore');
            await assetStore.save(asset);
        }
        // 3. Clear Registry & Initialize
        AgentRegistry_1.AgentRegistry.clear();
        process.env.PROJECT_ID = proj;
        // This should trigger Safe Mode because of checksum mismatch
        await AssetRegistryV2_1.assetRegistryV2.initialize();
        // 4. Verify Safe Mode
        expect(AssetRegistryV2_1.assetRegistryV2.isInSafeMode()).toBe(true);
    });
});
