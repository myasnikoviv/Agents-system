import { RunContextAssembler } from '@system/runtime';
import { AgentExecutor } from '@system/runtime';
import { AgentRegistry } from '@system/runtime';
import { PipelineRegistry } from '@system/runtime';
import { BlackboardService } from '@system/runtime';
import { DynamicDiscoveryService } from '@system/runtime';

async function verify() {
  console.log('--- STARTING RUNTIME VERIFICATION ---');

  // Initialize registries from docs
  await DynamicDiscoveryService.discoverAll();

  const agent = AgentRegistry.getAgent('pm-orchestrator');
  const pipeline = PipelineRegistry.getPipeline('new-feature');
  
  if (!agent || !pipeline) {
    console.error('Missing agent or pipeline registry data. Slugs checked: pm-orchestrator, new-feature');
    return;
  }

  // 1. Assemble Context
  console.log('1. Assembling RunContext...');
  const stage = pipeline.stages[0];
  if (!stage) {
    console.error('Pipeline has no stages.');
    return;
  }
  const context = await RunContextAssembler.assemble(
    agent,
    pipeline,
    stage.id,
    'Add a new feature to the bot',
    { runId: 'verify_run_123', threadId: 'thread_abc' }
  );
  console.log(`Context assembled for agent: ${context.agent.slug}`);
  console.log(`Tools resolved: ${context.tools.map(t => t.name).join(', ')}`);

  // 2. Blackboard Test
  console.log('\n2. Testing Blackboard Persistence...');
  await BlackboardService.saveArtifact(context, {
    runId: context.runId,
    stageId: stage.id,
    roleSlug: agent.slug,
    timestamp: new Date().toISOString(),
    summary: 'Verification artifact',
    findings: ['Memory is working']
  });
  
  const artifacts = await BlackboardService.getArtifacts(context);
  console.log(`Retrieved ${artifacts.length} artifacts from Redis.`);

  // 3. Executor Loop Test (Dry Run)
  console.log('\n3. Initializing AgentExecutor (Native Tool Loop)...');
  const executor = new AgentExecutor();
  console.log('Executor ready with NativeToolLoopRunner integration.');

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
