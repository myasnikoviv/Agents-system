"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GitExecutionGuard_1 = require("../GitExecutionGuard");
(0, globals_1.describe)('GitExecutionGuard', () => {
    (0, globals_1.it)('blocks mutating action on main', () => {
        const result = (0, GitExecutionGuard_1.validateMainBranchMutationPolicy)({
            context: { branch: 'main', worktreePath: '/tmp/wt' },
            hasMutatingAction: true,
        });
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(String(result.reason || '')).toContain('main_branch_mutation_forbidden');
    });
    (0, globals_1.it)('allows non-main mutating action', () => {
        const result = (0, GitExecutionGuard_1.validateMainBranchMutationPolicy)({
            context: { branch: 'codex/AGSYS-79', worktreePath: '/tmp/wt' },
            hasMutatingAction: true,
        });
        (0, globals_1.expect)(result.ok).toBe(true);
    });
    (0, globals_1.it)('allows non-mutating action on main', () => {
        const result = (0, GitExecutionGuard_1.validateMainBranchMutationPolicy)({
            context: { branch: 'main', worktreePath: '/tmp/wt' },
            hasMutatingAction: false,
        });
        (0, globals_1.expect)(result.ok).toBe(true);
    });
});
