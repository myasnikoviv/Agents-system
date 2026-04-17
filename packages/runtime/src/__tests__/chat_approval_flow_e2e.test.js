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
const globals_1 = require("@jest/globals");
const redisClient_1 = require("../redisClient");
const PipelineStateService_1 = require("../PipelineStateService");
globals_1.jest.mock('../AgentExecutor', () => {
    return {
        AgentExecutor: class {
            async runRole(roleSlug) {
                return `[mock:${roleSlug}] ok`;
            }
        }
    };
});
let app;
let server;
let baseUrl = '';
(0, globals_1.beforeAll)(async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.PILOT_DELEGATED_ROLES = 'research';
    process.env.PILOT_APPROVAL_POLICY_MODE = 'git-only';
    const { app: backendApp } = await Promise.resolve().then(() => __importStar(require('../../server/agentSystemBackend')));
    app = backendApp;
    await new Promise((resolve) => {
        server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === 'string')
        throw new Error('Failed to bind test server');
    baseUrl = `http://127.0.0.1:${addr.port}`;
}, 15000);
(0, globals_1.afterAll)(async () => {
    await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
    await (0, redisClient_1.closeRedisClient)();
});
(0, globals_1.describe)('Chat approve flow e2e', () => {
    const validIntakeMessage = 'Please implement a stable pipeline governance feature for the cockpit with acceptance criteria, verification steps, and git preflight enforcement.';
    (0, globals_1.it)('completes send -> interrupt -> approve chain to done', async () => {
        const startRes = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
        });
        (0, globals_1.expect)(startRes.status).toBe(200);
        const startData = await startRes.json();
        (0, globals_1.expect)(startData.success).toBe(true);
        (0, globals_1.expect)(startData.status).toBe('awaiting_approval');
        (0, globals_1.expect)(typeof startData.threadId).toBe('string');
        (0, globals_1.expect)(typeof startData.ticketId).toBe('string');
        (0, globals_1.expect)(typeof startData.selectedPipeline).toBe('string');
        (0, globals_1.expect)(['unified-task-intake', 'feature-change']).toContain(startData.selectedPipeline);
        (0, globals_1.expect)(typeof startData.pipelineConfidence).toBe('string');
        const approve1 = await fetch(`${baseUrl}/api/chat/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
        });
        (0, globals_1.expect)(approve1.status).toBe(200);
        const data1 = await approve1.json();
        (0, globals_1.expect)(data1.success).toBe(true);
        (0, globals_1.expect)(data1.status).toBe('docs_completed');
        (0, globals_1.expect)(Array.isArray(data1.logs)).toBe(true);
        (0, globals_1.expect)(data1.logs.length).toBeGreaterThan(0);
    }, 30000);
    (0, globals_1.it)('blocks approve when pipeline state next stage mismatches runtime state', async () => {
        const startRes = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
        });
        (0, globals_1.expect)(startRes.status).toBe(200);
        const startData = await startRes.json();
        (0, globals_1.expect)(startData.success).toBe(true);
        (0, globals_1.expect)(startData.status).toBe('awaiting_approval');
        await (0, PipelineStateService_1.upsertPipelineStateCard)({
            pipeline: startData.selectedPipeline,
            mode: 'linear',
            stage: 'approval_gate',
            completedStages: ['intake'],
            nextStage: 'git',
            currentOwner: 'Сокіл-Координатор (PM Orchestrator)',
            nextOwner: 'Pending Approval',
            ticket: startData.ticketId,
            threadId: startData.threadId,
            blockingGates: 'approval_required',
            evidenceLinks: startData.runId,
            activeBranch: 'codex/AGSYS-78-main-recovery',
            worktreePath: '/Users/myasnikoviv/development/agent-system-worktrees/AGSYS-78',
            preflightToken: '/Users/myasnikoviv/development/agent-system-worktrees/AGSYS-78/docs/process/git/preflights/AGSYS-78.env',
        });
        const approve = await fetch(`${baseUrl}/api/chat/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
        });
        (0, globals_1.expect)(approve.status).toBe(409);
        const data = await approve.json();
        (0, globals_1.expect)(data.success).toBe(false);
        (0, globals_1.expect)(data.status).toBe('blocked');
        (0, globals_1.expect)(String(data.error || '')).toContain('state_mismatch');
    });
    (0, globals_1.it)('blocks approve when branch/worktree context mismatches saved state card', async () => {
        const startRes = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: validIntakeMessage, executionMode: 'linear' }),
        });
        (0, globals_1.expect)(startRes.status).toBe(200);
        const startData = await startRes.json();
        (0, globals_1.expect)(startData.success).toBe(true);
        (0, globals_1.expect)(startData.status).toBe('awaiting_approval');
        await (0, PipelineStateService_1.upsertPipelineStateCard)({
            pipeline: startData.selectedPipeline,
            mode: 'linear',
            stage: 'approval_gate',
            completedStages: ['intake'],
            nextStage: 'git',
            currentOwner: 'Сокіл-Координатор (PM Orchestrator)',
            nextOwner: 'Pending Approval',
            ticket: startData.ticketId,
            threadId: startData.threadId,
            blockingGates: 'approval_required',
            evidenceLinks: startData.runId,
            activeBranch: 'codex/some-other-branch',
            worktreePath: '/tmp/other-worktree',
            preflightToken: '/tmp/non-existent.env',
        });
        const approve = await fetch(`${baseUrl}/api/chat/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId: startData.threadId, ticketId: startData.ticketId }),
        });
        (0, globals_1.expect)(approve.status).toBe(409);
        const data = await approve.json();
        (0, globals_1.expect)(data.success).toBe(false);
        (0, globals_1.expect)(data.status).toBe('blocked');
        (0, globals_1.expect)(String(data.error || '')).toContain('state_mismatch:card_branch');
    });
});
