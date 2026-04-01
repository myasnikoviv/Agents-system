import fs from 'fs';
import path from 'path';
import {
  getGitExecutionContext,
  validatePreflightTokenPolicy,
  GitExecutionContext,
} from '../GitExecutionGuard';
import { logGovernance } from './GovernanceLogger';

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
export function enforcePreflightGate(input: PreflightCheckInput): PreflightCheckResult {
  const context = getGitExecutionContext(input.workspacePath);

  // Non-mutating: allow, log as skip
  if (!input.hasMutatingAction) {
    logGovernance({
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

  const check = validatePreflightTokenPolicy({
    context,
    hasMutatingAction: true,
    preflightDir: input.preflightDir,
  });

  if (check.ok) {
    logGovernance({
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
  logGovernance({
    rule: 'git_preflight',
    status: 'fail',
    action: 'block',
    ticket: input.ticket,
    runId: input.runId,
    chainId: input.chainId,
    detail: check.reason,
  });

  throw new GovernancePreflightError(
    `[ENF-001] Git preflight hard gate BLOCKED for ticket=${input.ticket}: ${check.reason}`,
    check.reason,
    context,
  );
}

/**
 * Non-throwing variant — returns result without throwing.
 * Use only when you need to inspect the result before deciding to block.
 */
export function checkPreflightGate(input: PreflightCheckInput): PreflightCheckResult {
  try {
    return enforcePreflightGate(input);
  } catch (err) {
    if (err instanceof GovernancePreflightError) {
      return { ok: false, reason: err.reason, context: err.context };
    }
    throw err;
  }
}

export class GovernancePreflightError extends Error {
  constructor(
    message: string,
    public readonly reason: string | undefined,
    public readonly context: GitExecutionContext,
  ) {
    super(message);
    this.name = 'GovernancePreflightError';
  }
}
