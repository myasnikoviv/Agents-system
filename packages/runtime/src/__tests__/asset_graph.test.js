"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetRegistryV2_1 = require("../registries/AssetRegistryV2");
const redisClient_1 = require("../redisClient");
describe('Asset Dependency Graph Integration', () => {
    const tenantId = 'graph-test-tenant';
    const projectId = 'graph-test-proj';
    afterAll(async () => {
        await (0, redisClient_1.closeRedisClient)();
    });
    it('should automatically resolve dependencies during agent registration', async () => {
        // 1. Register a Skill
        const skillId = await AssetRegistryV2_1.assetRegistryV2.registerAsset({
            type: 'skill',
            slug: 'test-skill',
            path: '/dev/test-skill.md',
            name: 'Test Skill',
            tenantId,
            projectId
        });
        // 2. Register an Agent that uses the skill
        const agentId = await AssetRegistryV2_1.assetRegistryV2.registerAsset({
            type: 'agent',
            slug: 'test-agent',
            path: '/dev/test-agent.md',
            name: 'Test Agent',
            tenantId,
            projectId,
            attributes: {
                skills: ['test-skill']
            }
        });
        // 3. Verify Outgoing Link
        const deps = await AssetRegistryV2_1.assetRegistryV2.getDependencies(agentId);
        expect(deps.length).toBe(1);
        expect(deps[0].id).toBe(skillId);
        expect(deps[0].type).toBe('uses_skill');
        // 4. Verify Incoming Link (Impact)
        const impact = await AssetRegistryV2_1.assetRegistryV2.getImpactList(skillId);
        expect(impact.length).toBe(1);
        expect(impact[0]).toBe(agentId);
        console.log(`Verified Graph: Agent ${agentId} depends on Skill ${skillId}`);
    });
});
