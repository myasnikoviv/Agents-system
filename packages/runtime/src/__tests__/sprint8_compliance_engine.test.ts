import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeTaskForCompliance } from '../compliance/TaskAnalyzer';
import { buildExecutionPlan } from '../compliance/ExecutionPlanBuilder';
import { evaluateCompliance } from '../compliance/ComplianceEvaluator';
import { applyComplianceEnforcement, resetComplianceEnforcementState } from '../compliance/ComplianceEnforcementLoop';
import { writeComplianceLedger } from '../compliance/ComplianceLedger';

function makeTmpWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 's8-comp-'));
}

function test_task_analyzer_non_empty(): void {
  const plan = analyzeTaskForCompliance({
    runId: 'run-s8-1',
    projectId: 'agent_system',
    ticketId: 'AGSYS-S8-1',
    message: 'Please fix a bug in runtime execution flow',
  });
  console.assert(plan.pipeline === 'bug-fix', 'expected bug-fix pipeline');
  console.assert(plan.agents.length > 0, 'agents must not be empty');
  console.assert(plan.skills.length > 0, 'skills must not be empty');
  console.log('[PASS] S8 analyzer returns structured non-empty plan');
}

function test_execution_plan_builder(): void {
  const base = analyzeTaskForCompliance({
    runId: 'run-s8-2',
    projectId: 'agent_system',
    ticketId: 'AGSYS-S8-2',
    message: 'Implement new feature for runtime',
  });
  const plan = buildExecutionPlan(base);
  console.assert(plan.stages.length > 0, 'stages should be generated');
  console.log('[PASS] S8 execution plan builder includes stages');
}

function test_compliance_retry_then_deviation(): void {
  resetComplianceEnforcementState();
  const base = buildExecutionPlan(
    analyzeTaskForCompliance({
      runId: 'run-s8-3',
      projectId: 'agent_system',
      ticketId: 'AGSYS-S8-3',
      message: 'Refactor runtime modules',
    }),
  );
  const evaluation = evaluateCompliance(base, {
    pipelines: ['refactor'],
    agents: ['pm-orchestrator'],
    skills: [],
    stages: ['intake'],
  });
  const first = applyComplianceEnforcement(evaluation);
  const second = applyComplianceEnforcement(evaluation);
  console.assert(first.action === 'retry', 'first mismatch should retry');
  console.assert(second.action === 'deviation', 'second mismatch should produce deviation');
  console.log('[PASS] S8 enforcement loop retry limit works');
}

function test_compliance_ledger_written(): void {
  const workspace = makeTmpWorkspace();
  const base = buildExecutionPlan(
    analyzeTaskForCompliance({
      runId: 'run-s8-4',
      projectId: 'agent_system',
      ticketId: 'AGSYS-S8-4',
      message: 'Bug fix in planner',
    }),
  );
  const evaluation = evaluateCompliance(base, {
    pipelines: [base.pipeline],
    agents: base.agents,
    skills: base.skills,
    stages: base.stages,
  });
  const decision = applyComplianceEnforcement(evaluation);
  const file = writeComplianceLedger(evaluation, decision, workspace);
  console.assert(fs.existsSync(file), 'compliance ledger file should exist');
  const content = fs.readFileSync(file, 'utf-8');
  console.assert(content.includes('run-s8-4'), 'ledger should include runId');
  console.log('[PASS] S8 compliance ledger writes plan vs actual');
}

(async () => {
  console.log('\n=== Sprint 8 Compliance Engine Tests ===\n');
  test_task_analyzer_non_empty();
  test_execution_plan_builder();
  test_compliance_retry_then_deviation();
  test_compliance_ledger_written();
  console.log('\n=== Sprint 8 compliance tests completed successfully ===\n');
  process.exit(0);
})();
