"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RunLedger_1 = require("../RunLedger");
function eventWithError(error) {
    return {
        id: 'ev-123',
        type: 'agent.failed',
        timestamp: Date.now(),
        projectId: 'proj-77',
        runId: 'run-77',
        chainId: 'thread-77',
        actor: {
            type: 'agent',
            id: 'agent-77',
            role: 'TDD QA',
        },
        payload: { error },
    };
}
(0, globals_1.describe)('RunLedger failure taxonomy', () => {
    (0, globals_1.it)('classifies governance policy failures', () => {
        const reason = (0, RunLedger_1.classifyFailureReason)(eventWithError('main_branch_mutation_forbidden:main'));
        (0, globals_1.expect)(reason).toBe('governance_git_policy');
    });
    (0, globals_1.it)('classifies quota/rate failures', () => {
        const reason = (0, RunLedger_1.classifyFailureReason)(eventWithError('rate limit exceeded'));
        (0, globals_1.expect)(reason).toBe('quota_or_rate_limit');
    });
    (0, globals_1.it)('returns none for success', () => {
        const e = {
            ...eventWithError('x'),
            type: 'run.completed',
            payload: { status: 'success' },
        };
        (0, globals_1.expect)((0, RunLedger_1.classifyFailureReason)(e)).toBe('none');
    });
});
