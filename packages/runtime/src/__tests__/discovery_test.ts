import { DynamicDiscoveryService } from '../DynamicDiscoveryService';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { SkillRegistry } from '../registries/SkillRegistry';

async function testDiscovery() {
  console.log('--- Starting Discovery ---');
  await DynamicDiscoveryService.discoverAll();
  
  const agents = AgentRegistry.getAllAgents();
  console.log(`Discovered ${agents.length} agents:`, agents.map(a => a.name));
  
  const pipelines = PipelineRegistry.getAllPipelines();
  console.log(`Discovered ${pipelines.length} pipelines:`, pipelines.map(p => p.name));
  
  const skills = SkillRegistry.getAllSkills();
  console.log(`Discovered ${skills.length} skills:`, skills.map(s => s.name));

  const pm = AgentRegistry.getAgent('pm-orchestrator');
  if (pm) {
    console.log('\nPM Orchestrator Profile:');
    console.log('- Skills:', pm.skills);
    console.log('- Mission (first 50 chars):', pm.description?.substring(0, 50));
  }

  const newFeature = PipelineRegistry.getPipeline('new-feature');
  if (newFeature) {
    console.log('\nNew Feature Pipeline Stages:');
    newFeature.stages.forEach(s => console.log(`- Step ${s.id}: ${s.role}`));
  }
}

testDiscovery().catch(console.error);
