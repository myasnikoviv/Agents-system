import { GitExecutionContext } from '@system/shared';
/**
 * ENF-001 — Git Preflight Hard Gate
 *
 * Blocks execution unless:
 * 1. A valid preflight token file exists at docs/process/git/preflights/<ticket>.env
 * 2. The token matches the current branch + worktree
 * 3. STATUS=APPROVED and EXECUTION_APPROVED=YES
 *
 * Logging: every check emits a structured log via GovernanceLogger (ENF-004).
 */
export interface PreflightCheckInput {
    /** The ticket being executed, e.g. AGSYS-ENF-001 */
    ticket: string;
    runId?: string;
    chainId?: string;
    /** Whether this run includes any mutating actions */
    hasMutatingAction: boolean;
    /** Override workspace root (default: process.cwd()) */
    workspacePath?: string;
    /** Override preflight dir (default: docs/process/git/preflights) */
    preflightDir?: string;
}
export interface PreflightCheckResult {
    ok: boolean;
    reason?: string;
    context: GitExecutionContext;
}
/**
 * Enforce git preflight hard gate.
 * Throws if blocked (hard gate semantics per ENF-001).
 * Returns result if non-mutating or approved.
 */
export declare function enforcePreflightGate(input: PreflightCheckInput): PreflightCheckResult;
/**
 * Non-throwing variant — returns result without throwing.
 * Use only when you need to inspect the result before deciding to block.
 */
export declare function checkPreflightGate(input: PreflightCheckInput): PreflightCheckResult;
export declare class GovernancePreflightError extends Error {
    readonly reason: string | undefined;
    readonly context: GitExecutionContext;
    constructor(message: string, reason: string | undefined, context: GitExecutionContext);
}
