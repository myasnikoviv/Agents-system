"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernancePreflightError = void 0;
exports.enforcePreflightGate = enforcePreflightGate;
exports.checkPreflightGate = checkPreflightGate;
const shared_1 = require("@system/shared");
const GovernanceLogger_1 = require("./GovernanceLogger");
/**
 * Enforce git preflight hard gate.
 * Throws if blocked (hard gate semantics per ENF-001).
 * Returns result if non-mutating or approved.
 */
function enforcePreflightGate(input) {
    const context = (0, shared_1.getGitExecutionContext)(input.workspacePath);
    // Non-mutating: allow, log as skip
    if (!input.hasMutatingAction) {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'git_preflight',
            status: 'skip',
            action: 'allow',
            ticket: input.ticket,
            runId: input.runId,
            chainId: input.chainId,
            detail: 'non_mutating_action',
        });
        return { ok: true, context };
    }
    const check = (0, shared_1.validatePreflightTokenPolicy)({
        context,
        hasMutatingAction: true,
        preflightDir: input.preflightDir,
    });
    if (check.ok) {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'git_preflight',
            status: 'pass',
            action: 'allow',
            ticket: input.ticket,
            runId: input.runId,
            chainId: input.chainId,
            detail: `branch=${context.branch}`,
        });
        return { ok: true, context };
    }
    // FAIL → log + throw (hard gate: execution must not proceed)
    (0, GovernanceLogger_1.logGovernance)({
        rule: 'git_preflight',
        status: 'fail',
        action: 'block',
        ticket: input.ticket,
        runId: input.runId,
        chainId: input.chainId,
        detail: check.reason,
    });
    throw new GovernancePreflightError(`[ENF-001] Git preflight hard gate BLOCKED for ticket=${input.ticket}: ${check.reason}`, check.reason, context);
}
/**
 * Non-throwing variant — returns result without throwing.
 * Use only when you need to inspect the result before deciding to block.
 */
function checkPreflightGate(input) {
    try {
        return enforcePreflightGate(input);
    }
    catch (err) {
        if (err instanceof GovernancePreflightError) {
            return { ok: false, reason: err.reason, context: err.context };
        }
        throw err;
    }
}
class GovernancePreflightError extends Error {
    reason;
    context;
    constructor(message, reason, context) {
        super(message);
        this.reason = reason;
        this.context = context;
        this.name = 'GovernancePreflightError';
    }
}
exports.GovernancePreflightError = GovernancePreflightError;
