import fs from 'fs/promises';
import path from 'path';
import { RuntimeEvent } from './events/EventBus';

const LEDGER_DIR = path.resolve(process.cwd(), 'docs/process/runs/ledger');

export interface LedgerEntry {
  timestamp: string;
  runId: string;
  threadId: string;
  issueId: string;
  eventType: string;
  role: string;
  sourceStage: string;
  targetStage: string;
  status: string;
  failureReason: string;
  evidence: string;
}

export function classifyFailureReason(event: RuntimeEvent): string {
  if (event.status !== 'failed') {
    return 'none';
  }
  const raw = String(event.payload?.error || event.payload?.reason || '').toLowerCase();
  if (raw.includes('auth') || raw.includes('unauthorized')) return 'auth_error';
  if (raw.includes('quota') || raw.includes('rate')) return 'quota_or_rate_limit';
  if (raw.includes('timeout')) return 'timeout';
  if (raw.includes('state_mismatch')) return 'governance_state_mismatch';
  if (raw.includes('preflight') || raw.includes('main_branch_mutation_forbidden')) {
    return 'governance_git_policy';
  }
  return 'runtime_failure';
}

function buildLedgerEntry(event: RuntimeEvent): LedgerEntry {
  return {
    timestamp: event.timestamp,
    runId: event.pipeline_run_id,
    threadId: event.thread_id,
    issueId: event.plane_issue_id,
    eventType: event.event_type,
    role: event.agent_role,
    sourceStage: event.source_stage,
    targetStage: event.target_stage || '',
    status: event.status,
    failureReason: classifyFailureReason(event),
    evidence: JSON.stringify(event.payload || {}),
  };
}

export async function appendRunLedger(event: RuntimeEvent): Promise<void> {
  await fs.mkdir(LEDGER_DIR, { recursive: true });
  const fileName = `${event.pipeline_run_id || 'unknown-run'}.jsonl`;
  const filePath = path.join(LEDGER_DIR, fileName);
  const line = JSON.stringify(buildLedgerEntry(event)) + '\n';
  await fs.appendFile(filePath, line, 'utf-8');
}

