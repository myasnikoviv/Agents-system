"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamicDiscoveryService_1 = require("../DynamicDiscoveryService");
const AgentRegistry_1 = require("../registries/AgentRegistry");
const PipelineRegistry_1 = require("../registries/PipelineRegistry");
const SkillRegistry_1 = require("../registries/SkillRegistry");
async function testDiscovery() {
    console.log('--- Starting Discovery ---');
    await DynamicDiscoveryService_1.DynamicDiscoveryService.discoverAll();
    const agents = AgentRegistry_1.AgentRegistry.getAllAgents();
    console.log(`Discovered ${agents.length} agents:`, agents.map(a => a.name));
    const pipelines = PipelineRegistry_1.PipelineRegistry.getAllPipelines();
    console.log(`Discovered ${pipelines.length} pipelines:`, pipelines.map(p => p.name));
    const skills = SkillRegistry_1.SkillRegistry.getAllSkills();
    console.log(`Discovered ${skills.length} skills:`, skills.map(s => s.name));
    const pm = AgentRegistry_1.AgentRegistry.getAgent('pm-orchestrator');
    if (pm) {
        console.log('\nPM Orchestrator Profile:');
        console.log('- Skills:', pm.skills);
        console.log('- Mission (first 50 chars):', pm.description?.substring(0, 50));
    }
    const newFeature = PipelineRegistry_1.PipelineRegistry.getPipeline('new-feature');
    if (newFeature) {
        console.log('\nNew Feature Pipeline Stages:');
        newFeature.stages.forEach(s => console.log(`- Step ${s.id}: ${s.role}`));
    }
}
testDiscovery().catch(console.error);
