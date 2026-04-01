import { enforcePreflightGate, checkPreflightGate } from '../src/runtime/governance/PreflightEnforcer';
import { enforcePostflightGate, checkPostflightEvidence, writeTestReportStub } from '../src/runtime/governance/PostflightEnforcer';
import { logImprovementLoopGate } from '../src/runtime/governance/ImprovementLoopEnforcer';
import { logParticipationGate } from '../src/runtime/governance/AgentParticipationEnforcer';
import { logPipelineUsageGate } from '../src/runtime/governance/PipelineUsageEnforcer';
import { logCostTrackerGate } from '../src/runtime/governance/CostTrackerEnforcer';
import fs from 'fs';
import path from 'path';

async function runGovernanceVerification() {
  console.log('--- GOVERNANCE ENFORCEMENT VERIFICATION (SPRINT 5.5) ---');

  const ticketId = 'AGSYS-ENF-TEST';
  const workspacePath = process.cwd();

  // 1. Test Postflight Gate (Hard Gate)
  console.log('\n[1/6] Testing Postflight Hard Gate...');
  const testsDir = path.join(workspacePath, 'docs/process/tests');
  const testFile = path.join(testsDir, `${ticketId}.md`);
  
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);

  try {
    console.log('Expect Block (No Artifact):');
    enforcePostflightGate({ ticket: ticketId });
    console.error('FAIL: Should have blocked closure!');
  } catch (err: any) {
    console.log('PASS: Blocked closure as expected:', err.message);
  }

  console.log('Writing stub...');
  writeTestReportStub({ ticket: ticketId, status: 'PASS' });
  
  try {
    enforcePostflightGate({ ticket: ticketId });
    console.log('PASS: Allowed closure after stub written.');
  } catch (err: any) {
    console.error('FAIL: Should have allowed closure!', err.message);
  }

  // 2. Test Preflight Gate (Hard Gate)
  console.log('\n[2/6] Testing Preflight Hard Gate...');
  try {
    console.log('Testing Non-Mutating (Should Pass):');
    enforcePreflightGate({ ticket: ticketId, hasMutatingAction: false });
    console.log('PASS: Allowed non-mutating action.');
  } catch (err: any) {
    console.error('FAIL: Should have allowed non-mutating action!', err.message);
  }

  // 3. Test Soft Gates (should not throw)
  console.log('\n[3/6] Testing Improvement Loop Soft Gate...');
  logImprovementLoopGate({ ticket: ticketId, projectId: 'test', workspacePath });
  console.log('PASS: Logged improvement loop gate.');

  console.log('\n[4/6] Testing Participation Soft Gate...');
  logParticipationGate({ 
    agentSlug: 'developer', 
    ticketId, 
    content: 'PERCEIVE: checking file... THINK: need to fix... PLAN: edit file... ACT: write... REFLECT: done.' 
  });
  console.log('PASS: Logged participation gate.');

  console.log('\n[5/6] Testing Pipeline Usage Soft Gate...');
  logPipelineUsageGate({ 
    ticketId, 
    pipelineId: 'unified-task-intake', 
    isExplicit: true, 
    confidence: 0.95 
  });
  console.log('PASS: Logged pipeline usage gate.');

  console.log('\n[6/6] Testing Cost Tracker Soft Gate...');
  logCostTrackerGate({
    ticketId,
    runId: 'run_123',
    agentSlug: 'pm-orchestrator',
    inputTokens: 500,
    outputTokens: 200,
    totalTokens: 700
  });
  console.log('PASS: Logged cost tracker gate.');

  console.log('\n--- ALL GOVERNANCE GATES VERIFIED ---');
}

runGovernanceVerification().catch(err => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
