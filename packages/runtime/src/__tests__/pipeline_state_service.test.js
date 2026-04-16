"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PipelineStateService_1 = require("../PipelineStateService");
(0, globals_1.describe)('PipelineStateService git context continuity', () => {
    (0, globals_1.it)('persists git context fields in pipeline state card', async () => {
        const ticket = `TEST-STATE-${Date.now()}`;
        const threadId = `thread-${Date.now()}`;
        await (0, PipelineStateService_1.upsertPipelineStateCard)({
            pipeline: 'feature-change',
            mode: 'linear',
            stage: 'approval_gate',
            completedStages: ['intake'],
            nextStage: 'research',
            currentOwner: 'PM',
            nextOwner: 'Research',
            ticket,
            threadId,
            blockingGates: 'approval_required',
            evidenceLinks: 'run-1',
            activeBranch: 'codex/AGSYS-83',
            worktreePath: '/tmp/wt-83',
            preflightToken: '/tmp/preflights/TRADE-83.env',
        });
        const card = await (0, PipelineStateService_1.readPipelineStateCard)(ticket, threadId);
        (0, globals_1.expect)(card).not.toBeNull();
        (0, globals_1.expect)(card?.activeBranch).toBe('codex/AGSYS-83');
        (0, globals_1.expect)(card?.worktreePath).toBe('/tmp/wt-83');
        (0, globals_1.expect)(card?.preflightToken).toBe('/tmp/preflights/TRADE-83.env');
    });
    (0, globals_1.it)('blocks resume when git context mismatches saved state', async () => {
        const ticket = `TEST-STATE-${Date.now()}-2`;
        const threadId = `thread-${Date.now()}-2`;
        await (0, PipelineStateService_1.upsertPipelineStateCard)({
            pipeline: 'feature-change',
            mode: 'linear',
            stage: 'approval_gate',
            completedStages: ['intake'],
            nextStage: 'research',
            currentOwner: 'PM',
            nextOwner: 'Research',
            ticket,
            threadId,
            blockingGates: 'approval_required',
            evidenceLinks: 'run-2',
            activeBranch: 'codex/AGSYS-83',
            worktreePath: '/tmp/wt-83',
            preflightToken: '/tmp/preflights/TRADE-83.env',
        });
        const result = await (0, PipelineStateService_1.validateResumeConsistency)({
            ticket,
            threadId,
            expectedBranch: 'codex/OTHER',
            expectedWorktreePath: '/tmp/wt-83',
            expectedPreflightToken: '/tmp/preflights/TRADE-83.env',
        });
        (0, globals_1.expect)(result.ok).toBe(false);
        if (result.ok === false) {
            (0, globals_1.expect)(result.reason).toContain('state_mismatch:card_branch');
        }
    });
    (0, globals_1.it)('blocks resume when editor source mismatches saved state', async () => {
        const ticket = `TEST-STATE-${Date.now()}-3`;
        const threadId = `thread-${Date.now()}-3`;
        await (0, PipelineStateService_1.upsertPipelineStateCard)({
            pipeline: 'feature-change',
            mode: 'linear',
            stage: 'approval_gate',
            completedStages: ['intake'],
            nextStage: 'research',
            currentOwner: 'PM',
            nextOwner: 'Research',
            ticket,
            threadId,
            blockingGates: 'approval_required',
            evidenceLinks: 'run-3',
            activeBranch: 'codex/AGSYS-83',
            worktreePath: '/tmp/wt-83',
            preflightToken: '/tmp/preflights/TRADE-83.env',
            editorSource: 'codex',
        });
        const result = await (0, PipelineStateService_1.validateResumeConsistency)({
            ticket,
            threadId,
            expectedEditorSource: 'claude',
        });
        (0, globals_1.expect)(result.ok).toBe(false);
        if (result.ok === false) {
            (0, globals_1.expect)(result.reason).toContain('state_mismatch:card_editor');
        }
    });
});
