import fs from 'fs';
import path from 'path';

/**
 * ENF-004 — Governance Logging
 * Every governance rule check emits a structured log entry:
 * { rule, status, action, ticket?, detail?, ts }
 */

export type GovernanceStatus = 'pass' | 'fail' | 'skip';
export type GovernanceAction = 'block' | 'retry' | 'allow' | 'warn' | 'log';

export interface GovernanceLogEntry {
  rule: string;
  status: GovernanceStatus;
  action: GovernanceAction;
  ticket?: string;
  detail?: string;
  ts: string;
}

const LOG_DIR = path.resolve(process.cwd(), 'docs/runtime/governance/logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Write a governance log entry to:
 * - stdout (structured JSON, always)
 * - docs/runtime/governance/logs/<ticket|global>.jsonl (append)
 */
export function logGovernance(entry: Omit<GovernanceLogEntry, 'ts'>): GovernanceLogEntry {
  const full: GovernanceLogEntry = { ...entry, ts: new Date().toISOString() };
  const line = JSON.stringify(full);

  // stdout — always visible
  console.log(`[GOVERNANCE] ${line}`);

  // file append
  try {
    ensureLogDir();
    const filename = entry.ticket
      ? `${entry.ticket.replace(/[^a-zA-Z0-9._-]/g, '_')}.jsonl`
      : 'global.jsonl';
    fs.appendFileSync(path.join(LOG_DIR, filename), line + '\n', 'utf-8');
  } catch {
    // non-blocking: log failure does not stop execution
    console.warn('[GOVERNANCE] Failed to write log to file');
  }

  return full;
}

/**
 * Read all governance log entries for a given ticket (or global).
 */
export function readGovernanceLogs(ticket?: string): GovernanceLogEntry[] {
  ensureLogDir();
  const filename = ticket
    ? `${ticket.replace(/[^a-zA-Z0-9._-]/g, '_')}.jsonl`
    : 'global.jsonl';
  const filePath = path.join(LOG_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as GovernanceLogEntry);
}
