"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const governance_1 = require("@system/governance");
const governance_2 = require("@system/governance");
const governance_3 = require("@system/governance");
const governance_4 = require("@system/governance");
const governance_5 = require("@system/governance");
const governance_6 = require("@system/governance");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runGovernanceVerification() {
    console.log('--- GOVERNANCE ENFORCEMENT VERIFICATION (SPRINT 5.5) ---');
    const ticketId = 'AGSYS-ENF-TEST';
    const workspacePath = process.cwd();
    // 1. Test Postflight Gate (Hard Gate)
    console.log('\n[1/6] Testing Postflight Hard Gate...');
    const testsDir = path_1.default.join(workspacePath, 'docs/process/tests');
    const testFile = path_1.default.join(testsDir, `${ticketId}.md`);
    if (fs_1.default.existsSync(testFile))
        fs_1.default.unlinkSync(testFile);
    try {
        console.log('Expect Block (No Artifact):');
        (0, governance_2.enforcePostflightGate)({ ticket: ticketId });
        console.error('FAIL: Should have blocked closure!');
    }
    catch (err) {
        console.log('PASS: Blocked closure as expected:', err.message);
    }
    console.log('Writing stub...');
    (0, governance_2.writeTestReportStub)({ ticket: ticketId, status: 'PASS' });
    try {
        (0, governance_2.enforcePostflightGate)({ ticket: ticketId });
        console.log('PASS: Allowed closure after stub written.');
    }
    catch (err) {
        console.error('FAIL: Should have allowed closure!', err.message);
    }
    // 2. Test Preflight Gate (Hard Gate)
    console.log('\n[2/6] Testing Preflight Hard Gate...');
    try {
        console.log('Testing Non-Mutating (Should Pass):');
        (0, governance_1.enforcePreflightGate)({ ticket: ticketId, hasMutatingAction: false });
        console.log('PASS: Allowed non-mutating action.');
    }
    catch (err) {
        console.error('FAIL: Should have allowed non-mutating action!', err.message);
    }
    // 3. Test Soft Gates (should not throw)
    console.log('\n[3/6] Testing Improvement Loop Soft Gate...');
    (0, governance_3.logImprovementLoopGate)({ ticket: ticketId, projectId: 'test', workspacePath });
    console.log('PASS: Logged improvement loop gate.');
    console.log('\n[4/6] Testing Participation Soft Gate...');
    (0, governance_4.logParticipationGate)({
        agentSlug: 'developer',
        ticketId,
        content: 'PERCEIVE: checking file... THINK: need to fix... PLAN: edit file... ACT: write... REFLECT: done.'
    });
    console.log('PASS: Logged participation gate.');
    console.log('\n[5/6] Testing Pipeline Usage Soft Gate...');
    (0, governance_5.logPipelineUsageGate)({
        ticketId,
        pipelineId: 'unified-task-intake',
        isExplicit: true,
        confidence: 0.95
    });
    console.log('PASS: Logged pipeline usage gate.');
    console.log('\n[6/6] Testing Cost Tracker Soft Gate...');
    (0, governance_6.logCostTrackerGate)({
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
