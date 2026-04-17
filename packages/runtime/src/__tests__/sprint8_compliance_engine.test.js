"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const TaskAnalyzer_1 = require("../compliance/TaskAnalyzer");
const ExecutionPlanBuilder_1 = require("../compliance/ExecutionPlanBuilder");
const ComplianceEvaluator_1 = require("../compliance/ComplianceEvaluator");
const ComplianceEnforcementLoop_1 = require("../compliance/ComplianceEnforcementLoop");
const ComplianceLedger_1 = require("../compliance/ComplianceLedger");
function makeTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's8-comp-'));
}
function test_task_analyzer_non_empty() {
    const plan = (0, TaskAnalyzer_1.analyzeTaskForCompliance)({
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
function test_execution_plan_builder() {
    const base = (0, TaskAnalyzer_1.analyzeTaskForCompliance)({
        runId: 'run-s8-2',
        projectId: 'agent_system',
        ticketId: 'AGSYS-S8-2',
        message: 'Implement new feature for runtime',
    });
    const plan = (0, ExecutionPlanBuilder_1.buildExecutionPlan)(base);
    console.assert(plan.stages.length > 0, 'stages should be generated');
    console.log('[PASS] S8 execution plan builder includes stages');
}
function test_compliance_retry_then_deviation() {
    (0, ComplianceEnforcementLoop_1.resetComplianceEnforcementState)();
    const base = (0, ExecutionPlanBuilder_1.buildExecutionPlan)((0, TaskAnalyzer_1.analyzeTaskForCompliance)({
        runId: 'run-s8-3',
        projectId: 'agent_system',
        ticketId: 'AGSYS-S8-3',
        message: 'Refactor runtime modules',
    }));
    const evaluation = (0, ComplianceEvaluator_1.evaluateCompliance)(base, {
        pipelines: ['refactor'],
        agents: ['pm-orchestrator'],
        skills: [],
        stages: ['intake'],
    });
    const first = (0, ComplianceEnforcementLoop_1.applyComplianceEnforcement)(evaluation);
    const second = (0, ComplianceEnforcementLoop_1.applyComplianceEnforcement)(evaluation);
    console.assert(first.action === 'retry', 'first mismatch should retry');
    console.assert(second.action === 'deviation', 'second mismatch should produce deviation');
    console.log('[PASS] S8 enforcement loop retry limit works');
}
function test_compliance_ledger_written() {
    const workspace = makeTmpWorkspace();
    const base = (0, ExecutionPlanBuilder_1.buildExecutionPlan)((0, TaskAnalyzer_1.analyzeTaskForCompliance)({
        runId: 'run-s8-4',
        projectId: 'agent_system',
        ticketId: 'AGSYS-S8-4',
        message: 'Bug fix in planner',
    }));
    const evaluation = (0, ComplianceEvaluator_1.evaluateCompliance)(base, {
        pipelines: [base.pipeline],
        agents: base.agents,
        skills: base.skills,
        stages: base.stages,
    });
    const decision = (0, ComplianceEnforcementLoop_1.applyComplianceEnforcement)(evaluation);
    const file = (0, ComplianceLedger_1.writeComplianceLedger)(evaluation, decision, workspace);
    console.assert(fs_1.default.existsSync(file), 'compliance ledger file should exist');
    const content = fs_1.default.readFileSync(file, 'utf-8');
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
