/**
 * ENF-004 — Governance Logging
 * Every governance rule check emits a structured log entry:
 * { rule, status, action, ticket?, detail?, ts }
 */
export type GovernanceStatus = 'pass' | 'fail' | 'skip';
export type GovernanceAction = 'block' | 'retry' | 'allow' | 'warn' | 'log' | 'escalate';
export interface GovernanceLogEntry {
    rule: string;
    status: GovernanceStatus;
    action: GovernanceAction;
    ticket?: string;
    runId?: string;
    chainId?: string;
    detail?: string;
    ts: string;
}
/**
 * Write a governance log entry to:
 * - stdout (structured JSON, always)
 * - docs/runtime/governance/logs/<ticket|global>.jsonl (append)
 * - Redis Event Stream via EventBus
 */
export declare function logGovernance(entry: Omit<GovernanceLogEntry, 'ts'>): GovernanceLogEntry;
/**
 * Read all governance log entries for a given ticket (or global).
 */
export declare function readGovernanceLogs(ticket?: string): GovernanceLogEntry[];
