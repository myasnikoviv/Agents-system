"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const globals_1 = require("@jest/globals");
const GitExecutionGuard_1 = require("../GitExecutionGuard");
const BlackboardService_1 = require("../BlackboardService");
const AgentWorkbenchScheduler_1 = require("../AgentWorkbenchScheduler");
function writeApprovedToken(preflightDir, context) {
    fs_1.default.mkdirSync(preflightDir, { recursive: true });
    const tokenPath = path_1.default.join(preflightDir, 'S16-2.env');
    fs_1.default.writeFileSync(tokenPath, [
        `BRANCH=${context.branch}`,
        `WORKTREE=${context.worktreePath}`,
        'STATUS=APPROVED',
        'EXECUTION_APPROVED=YES',
        'APPROVED_BY=PM',
        `APPROVED_AT=${new Date().toISOString()}`,
    ].join('\n'), 'utf-8');
}
(0, globals_1.describe)('Final Validation Remediation Scenarios', () => {
    (0, globals_1.it)('Scenario #1: full happy path has tools, artifacts, governance outputs', () => {
        const output = (0, child_process_1.execSync)('npm run verify', {
            cwd: process.cwd(),
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        (0, globals_1.expect)(output).toContain('FINAL AGENTIC RUNTIME PROOF');
        (0, globals_1.expect)(output).toContain('tool_call_raw');
        (0, globals_1.expect)(output).toContain('FINAL RESPONSE FROM RUNTIME');
        (0, globals_1.expect)(output).toContain('Saved artifacts:');
    });
    (0, globals_1.it)('Scenario #2: preflight block -> remediation token -> retry pass', () => {
        const context = (0, GitExecutionGuard_1.getGitExecutionContext)(process.cwd());
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's16-preflight-'));
        const first = (0, GitExecutionGuard_1.validatePreflightTokenPolicy)({
            context,
            hasMutatingAction: true,
            preflightDir: tmpDir,
        });
        (0, globals_1.expect)(first.ok).toBe(false);
        (0, globals_1.expect)(String(first.reason || '')).toContain('preflight_missing');
        writeApprovedToken(tmpDir, context);
        const second = (0, GitExecutionGuard_1.validatePreflightTokenPolicy)({
            context,
            hasMutatingAction: true,
            preflightDir: tmpDir,
        });
        (0, globals_1.expect)(second.ok).toBe(true);
    });
    (0, globals_1.it)('Scenario #5: parallel multi-agent execution semantics (no race)', async () => {
        (0, AgentWorkbenchScheduler_1.resetWorkbenchState)();
        const [a, b] = await Promise.all([
            Promise.resolve((0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-A')),
            Promise.resolve((0, AgentWorkbenchScheduler_1.acquireToolLease)('figma', 'agent-B')),
        ]);
        (0, globals_1.expect)([a.status, b.status].sort()).toEqual(['acquired', 'queued']);
        const released = (0, AgentWorkbenchScheduler_1.releaseToolLease)('figma', a.status === 'acquired' ? 'agent-A' : 'agent-B');
        (0, globals_1.expect)(released.released).toBe(true);
        (0, globals_1.expect)(Boolean(released.nextOwner)).toBe(true);
    });
    (0, globals_1.it)('Scenario #7: memory is isolated between two project namespaces', async () => {
        const run = `s16-7-${Date.now()}`;
        const ctxA = { projectId: 'proj-A', chainId: 'chain-A', runId: run };
        const ctxB = { projectId: 'proj-B', chainId: 'chain-B', runId: run };
        await BlackboardService_1.BlackboardService.publishFact(ctxA, 'isolation_key', { owner: 'A' }, 'run');
        await BlackboardService_1.BlackboardService.publishFact(ctxB, 'isolation_key', { owner: 'B' }, 'run');
        const contextA = {
            projectId: 'proj-A',
            chainId: 'chain-A',
            runId: run,
            artifacts: { priorOutputs: [] },
            memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] },
        };
        const contextB = {
            projectId: 'proj-B',
            chainId: 'chain-B',
            runId: run,
            artifacts: { priorOutputs: [] },
            memory: { sharedFacts: {}, runDecisions: {}, threadHistory: [] },
        };
        await BlackboardService_1.BlackboardService.hydrate(contextA);
        await BlackboardService_1.BlackboardService.hydrate(contextB);
        (0, globals_1.expect)(contextA.memory.sharedFacts.isolation_key.owner).toBe('A');
        (0, globals_1.expect)(contextB.memory.sharedFacts.isolation_key.owner).toBe('B');
    });
});
