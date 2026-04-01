import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  aggregateSignals,
  buildImprovementTicketDrafts,
  generateImprovementSignals,
  queueIsolationKeys,
  writeImprovementArtifacts,
} from '../improvement/ImprovementEngine';

function mkTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's11-improvement-'));
}

function seedRunData(workspace: string, runId: string): void {
  const costDir = path.join(workspace, 'docs/process/runs/cost');
  fs.mkdirSync(costDir, { recursive: true });
  fs.writeFileSync(
    path.join(costDir, `${runId}.json`),
    JSON.stringify({ runId, projectId: 'agent_system', tokens: 180000, retries: 4, loops: 12 }, null, 2),
    'utf-8',
  );

  const govDir = path.join(workspace, 'docs/runtime/governance/logs');
  fs.mkdirSync(govDir, { recursive: true });
  fs.writeFileSync(
    path.join(govDir, 'global.jsonl'),
    [
      JSON.stringify({ runId, rule: 'compliance_engine', status: 'fail' }),
      JSON.stringify({ runId, rule: 'compliance_engine', status: 'fail' }),
    ].join('\n') + '\n',
    'utf-8',
  );
}

function test_signal_generation_and_aggregation(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s11-1';
  seedRunData(workspace, runId);
  const signals = generateImprovementSignals({ workspacePath: workspace, runId, projectId: 'agent_system' });
  console.assert(signals.length >= 2, 'expected multiple improvement signals');
  const aggregated = aggregateSignals([...signals, ...signals]);
  console.assert(aggregated.length <= signals.length, 'aggregation should deduplicate');
  console.log('[PASS] S11 signal generation + aggregation');
}

function test_ticket_drafts_and_traceability(): void {
  const workspace = mkTmpWorkspace();
  const runId = 'run-s11-2';
  seedRunData(workspace, runId);
  const signals = generateImprovementSignals({ workspacePath: workspace, runId, projectId: 'agent_system' });
  const tickets = buildImprovementTicketDrafts(signals);
  console.assert(tickets.length === signals.length, 'ticket drafts should map from signals');
  console.assert(tickets[0].type === 'agent_system_improvement', 'ticket type contract must match');

  const files = writeImprovementArtifacts({ workspacePath: workspace, runId, signals, tickets, commitSha: 'abc123' });
  console.assert(fs.existsSync(files.signalsPath), 'signals artifact must exist');
  console.assert(fs.existsSync(files.ticketsPath), 'ticket drafts artifact must exist');
  console.assert(fs.existsSync(files.tracePath), 'traceability artifact must exist');
  console.log('[PASS] S11 ticket draft + traceability');
}

function test_async_isolation_keys(): void {
  const q = queueIsolationKeys('agent_system');
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
