"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("@system/runtime");
const runtime_2 = require("@system/runtime");
const runtime_3 = require("@system/runtime");
const runtime_4 = require("@system/runtime");
const runtime_5 = require("@system/runtime");
const runtime_6 = require("@system/runtime");
const runtime_7 = require("@system/runtime");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../.env') });
class LogicalAgenticAdapter {
    step = 0;
    files = [
        'src/runtime/AgentExecutor.ts',
        'src/runtime/NativeToolLoopRunner.ts',
        'src/runtime/BlackboardService.ts'
    ];
    compilePayload(context) {
        return {
            runId: context.runId,
            memory: { threadHistory: [] }
        };
    }
    async execute(context) {
        if (this.step < 3) {
            const file = this.files[this.step++];
            return {
                ok: true,
                content: `Checking lines in ${file}...`,
                responseMode: 'tool_call',
                toolCalls: [{ id: `call_${this.step}`, tool: 'read_file', args: { path: `/Users/myasnikoviv/development/agent-system/${file}` } }]
            };
        }
        // In RunContext, the history is in memory.threadHistory
        const history = context.memory?.threadHistory || [];
        const observations = history.filter((h) => h.role === 'observation');
        // The observation content is now the REAL file content
        const counts = observations.map((h) => {
            const lines = h.content.split('\n');
            return { lines: lines.length };
        });
        const maxLines = Math.max(...counts.map((c) => c.lines));
        const largestFile = this.files[counts.findIndex((c) => c.lines === maxLines)];
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
    const pipelineId = 'unified-task-intake';
    await runtime_5.DynamicDiscoveryService.discoverAll();
    const runId = `proof_${Date.now()}`;
    const agent = runtime_3.AgentRegistry.getAgent('system-core');
    const pipeline = runtime_4.PipelineRegistry.getPipeline(pipelineId) || runtime_4.PipelineRegistry.getAllPipelines()[0];
    if (!agent || !pipeline || !pipeline.stages.length) {
        throw new Error('Runtime proof bootstrap failed: missing system-core agent or discoverable pipeline/stages.');
    }
    const initialStageId = pipeline.stages[0].id;
    const context = await runtime_1.RunContextAssembler.assemble(agent, pipeline, initialStageId, 'Count and compare lines in 3 real files', { runId });
    const adapter = new LogicalAgenticAdapter();
    const executor = new runtime_2.AgentExecutor();
    console.log('Running autonomous loop...');
    const result = await executor.run(context, adapter);
    console.log('\n--- FINAL RESPONSE FROM RUNTIME (REAL DATA) ---');
    console.log(result.content);
    // SAVE TO BLACKBOARD FOR REAL CROSS-AGENT IMPACT
    await runtime_6.BlackboardService.saveArtifact({
        projectId: context.projectId,
        chainId: context.chainId,
        runId,
    }, {
        runId,
        stageId: 'comparison',
        roleSlug: 'pm-orchestrator',
        timestamp: new Date().toISOString(),
        summary: 'Line counting proof complete.',
        findings: [result.content]
    });
    console.log('\n--- BLACKBOARD AUDIT ---');
    const artifacts = await runtime_6.BlackboardService.getArtifacts({
        projectId: context.projectId,
        chainId: context.chainId,
        runId,
    });
    console.log(`Saved artifacts: ${artifacts.length}`);
    console.log(`Last finding: ${artifacts[0]?.findings?.[0] || 'None'}`);
}
runFinalProof()
    .then(async () => {
    await (0, runtime_7.closeRedisClient)();
    process.exit(0);
})
    .catch(async (err) => {
    console.error(err);
    await (0, runtime_7.closeRedisClient)();
    process.exit(1);
});
