"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ImprovementEngine_1 = require("../improvement/ImprovementEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's11-improvement-'));
}
function seedRunData(workspace, runId) {
    const costDir = path_1.default.join(workspace, 'docs/process/runs/cost');
    fs_1.default.mkdirSync(costDir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(costDir, `${runId}.json`), JSON.stringify({ runId, projectId: 'agent_system', tokens: 180000, retries: 4, loops: 12 }, null, 2), 'utf-8');
    const govDir = path_1.default.join(workspace, 'docs/runtime/governance/logs');
    fs_1.default.mkdirSync(govDir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(govDir, 'global.jsonl'), [
        JSON.stringify({ runId, rule: 'compliance_engine', status: 'fail' }),
        JSON.stringify({ runId, rule: 'compliance_engine', status: 'fail' }),
    ].join('\n') + '\n', 'utf-8');
}
function test_signal_generation_and_aggregation() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s11-1';
    seedRunData(workspace, runId);
    const signals = (0, ImprovementEngine_1.generateImprovementSignals)({ workspacePath: workspace, runId, projectId: 'agent_system' });
    console.assert(signals.length >= 2, 'expected multiple improvement signals');
    const aggregated = (0, ImprovementEngine_1.aggregateSignals)([...signals, ...signals]);
    console.assert(aggregated.length <= signals.length, 'aggregation should deduplicate');
    console.log('[PASS] S11 signal generation + aggregation');
}
function test_ticket_drafts_and_traceability() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s11-2';
    seedRunData(workspace, runId);
    const signals = (0, ImprovementEngine_1.generateImprovementSignals)({ workspacePath: workspace, runId, projectId: 'agent_system' });
    const tickets = (0, ImprovementEngine_1.buildImprovementTicketDrafts)(signals);
    console.assert(tickets.length === signals.length, 'ticket drafts should map from signals');
    console.assert(tickets[0].type === 'agent_system_improvement', 'ticket type contract must match');
    const files = (0, ImprovementEngine_1.writeImprovementArtifacts)({ workspacePath: workspace, runId, signals, tickets, commitSha: 'abc123' });
    console.assert(fs_1.default.existsSync(files.signalsPath), 'signals artifact must exist');
    console.assert(fs_1.default.existsSync(files.ticketsPath), 'ticket drafts artifact must exist');
    console.assert(fs_1.default.existsSync(files.tracePath), 'traceability artifact must exist');
    console.log('[PASS] S11 ticket draft + traceability');
}
function test_async_isolation_keys() {
    const q = (0, ImprovementEngine_1.queueIsolationKeys)('agent_system');
    console.assert(q.runtimeQueue !== q.improvementQueue, 'runtime and improvement queues must be isolated');
    console.assert(q.runtimeQueue.includes('runtime'), 'runtime queue naming');
    console.assert(q.improvementQueue.includes('improvement'), 'improvement queue naming');
    console.log('[PASS] S11 async execution isolation keys');
}
(async () => {
    console.log('\n=== Sprint 11 Async Self-Improvement Tests ===\n');
    test_signal_generation_and_aggregation();
    test_ticket_drafts_and_traceability();
    test_async_isolation_keys();
    console.log('\n=== Sprint 11 async self-improvement tests completed successfully ===\n');
    process.exit(0);
})();
