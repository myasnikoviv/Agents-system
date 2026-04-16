"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RoleToolLoop_1 = require("../RoleToolLoop");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
(0, globals_1.describe)('RoleToolLoop guards', () => {
    (0, globals_1.it)('blocks unauthorized planned tool action for role', () => {
        const env = (0, RoleToolLoop_1.buildRoleExecutionEnvelope)({
            role: 'documentation-owner',
            pipeline: 'new-feature',
            stage: 'docs',
            ticketId: 'TRADE-72',
            threadId: 'thread-1',
        });
        const result = (0, RoleToolLoop_1.validatePlannedToolActions)(env, [
            { tool: 'git', purpose: 'commit docs changes' },
        ]);
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(result.blockedReason).toBe('unauthorized_tool:git');
    });
    (0, globals_1.it)('allows authorized planned tool actions', () => {
        const env = (0, RoleToolLoop_1.buildRoleExecutionEnvelope)({
            role: 'git-flow-manager',
            pipeline: 'git-conflict-recovery',
            stage: 'recovery',
            ticketId: 'TRADE-72',
            threadId: 'thread-2',
        });
        const result = (0, RoleToolLoop_1.validatePlannedToolActions)(env, [
            { tool: 'git', purpose: 'resolve branch scope and finalize merge' },
            { tool: 'plane', purpose: 'update task state' },
        ]);
        (0, globals_1.expect)(result.ok).toBe(true);
    });
    (0, globals_1.it)('blocks mutating action on main branch', () => {
        const env = (0, RoleToolLoop_1.buildRoleExecutionEnvelope)({
            role: 'developer',
            pipeline: 'new-feature',
            stage: 'implementation',
            ticketId: 'TRADE-79',
            threadId: 'thread-3',
        });
        const result = (0, RoleToolLoop_1.validatePlannedToolActions)(env, [{ tool: 'filesystem', purpose: 'implement feature' }], { branch: 'main', worktreePath: process.cwd() });
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(String(result.blockedReason || '')).toContain('main_branch_mutation_forbidden');
    });
    (0, globals_1.it)('blocks mutating action when preflight token is missing', () => {
        const env = (0, RoleToolLoop_1.buildRoleExecutionEnvelope)({
            role: 'developer',
            pipeline: 'new-feature',
            stage: 'implementation',
            ticketId: 'TRADE-80',
            threadId: 'thread-4',
        });
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'preflight-missing-'));
        const result = (0, RoleToolLoop_1.validatePlannedToolActions)(env, [{ tool: 'filesystem', purpose: 'implement feature' }], { branch: 'codex/AGSYS-80', worktreePath: '/tmp/wt-80' }, { preflightDir: tmpDir });
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(String(result.blockedReason || '')).toContain('preflight_missing');
    });
    (0, globals_1.it)('allows mutating action when valid preflight token exists', () => {
        const env = (0, RoleToolLoop_1.buildRoleExecutionEnvelope)({
            role: 'developer',
            pipeline: 'new-feature',
            stage: 'implementation',
            ticketId: 'TRADE-80',
            threadId: 'thread-5',
        });
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'preflight-valid-'));
        const tokenPath = path_1.default.join(tmpDir, 'TRADE-80.env');
        fs_1.default.writeFileSync(tokenPath, [
            'BRANCH=codex/AGSYS-80',
            'WORKTREE=/tmp/wt-80',
            'STATUS=APPROVED',
            'EXECUTION_APPROVED=YES',
            'APPROVED_BY=Pan Hilka',
            'APPROVED_AT=2026-03-19T12:00:00Z',
        ].join('\n'), 'utf-8');
        const result = (0, RoleToolLoop_1.validatePlannedToolActions)(env, [{ tool: 'filesystem', purpose: 'implement feature' }], { branch: 'codex/AGSYS-80', worktreePath: '/tmp/wt-80' }, { preflightDir: tmpDir });
        (0, globals_1.expect)(result.ok).toBe(true);
    });
});
