import { RunContextAssembler, RunContext } from '../src/runtime/context/RunContext';
import { AgentExecutor } from '../src/runtime/AgentExecutor';
import { AgentRegistry } from '../src/runtime/registries/AgentRegistry';
import { PipelineRegistry } from '../src/runtime/registries/PipelineRegistry';
import { DynamicDiscoveryService } from '../src/runtime/DynamicDiscoveryService';
import { BlackboardService } from '../src/runtime/BlackboardService';
import { ExecutionAdapter, ExecutionResult } from '../src/runtime/adapters/ExecutionAdapter';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

class LogicalAgenticAdapter implements ExecutionAdapter {
  private step = 0;
  private files = [
    'src/runtime/AgentExecutor.ts',
    'src/runtime/NativeToolLoopRunner.ts',
    'src/runtime/BlackboardService.ts'
  ];

  compilePayload(context: any): any {
    return { 
      runId: context.runId,
      memory: { threadHistory: [] }
    };
  }

  async execute(context: any): Promise<ExecutionResult> {
    if (this.step < 3) {
      const file = this.files[this.step++];
      return {
        ok: true,
        content: `Checking lines in ${file}...`,
        responseMode: 'tool_call',
        toolCalls: [{ id: `call_${this.step}`, tool: 'read_file', args: { path: `/Users/myasnikoviv/development/Agents system/${file}` } }]
      };
    }
    
    // In RunContext, the history is in memory.threadHistory
    const history = context.memory?.threadHistory || [];
    const observations = history.filter((h: any) => h.role === 'observation');
    
    // The observation content is now the REAL file content
    const counts = observations.map((h: any) => {
      const lines = h.content.split('\n');
      return { lines: lines.length };
    });

    const maxLines = Math.max(...counts.map((c: any) => c.lines));
    const largestFile = this.files[counts.findIndex((c: any) => c.lines === maxLines)];

    const summary = `Comparison result: 
1. ${this.files[0]}: ${counts[0]?.lines || 0} lines
2. ${this.files[1]}: ${counts[1]?.lines || 0} lines
3. ${this.files[2]}: ${counts[2]?.lines || 0} lines
The largest file is ${largestFile}.`;

    return {
      ok: true,
      content: summary,
      responseMode: 'final'
    };
  }
}

async function runFinalProof() {
  console.log('--- FINAL AGENTIC RUNTIME PROOF (REAL TOOLS, REAL DISK) ---');
  const agentCallsign = 'System Core';
  const pipelineId = 'bootstrap';
  await DynamicDiscoveryService.discoverAll();

  const runId = `proof_${Date.now()}`;
  const agent = AgentRegistry.getAgent('system-core')!;
  const pipeline = PipelineRegistry.getPipeline(pipelineId)!;

  const context = await RunContextAssembler.assemble(
    agent,
    pipeline,
    '10',
    'Count and compare lines in 3 real files',
    { runId }
  );

  const adapter = new LogicalAgenticAdapter() as any;
  const executor = new AgentExecutor();

  console.log('Running autonomous loop...');
  const result = await (executor as any).run(context, adapter);

  console.log('\n--- FINAL RESPONSE FROM RUNTIME (REAL DATA) ---');
  console.log(result.content);

  // SAVE TO BLACKBOARD FOR REAL CROSS-AGENT IMPACT
  await BlackboardService.saveArtifact(runId, {
    runId,
    stageId: 'comparison',
    roleSlug: 'pm-orchestrator',
    timestamp: new Date().toISOString(),
    summary: 'Line counting proof complete.',
    findings: [result.content]
  });

  console.log('\n--- BLACKBOARD AUDIT ---');
  const artifacts = await BlackboardService.getArtifacts(runId);
  console.log(`Saved artifacts: ${artifacts.length}`);
  console.log(`Last finding: ${artifacts[0]?.findings?.[0] || 'None'}`);
}

runFinalProof().catch(console.error);
