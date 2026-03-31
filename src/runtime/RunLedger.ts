import fs from 'fs/promises';
import path from 'path';
import { RuntimeEvent } from './events/EventBus';

const LEDGER_DIR = path.resolve(process.cwd(), 'docs/process/runs/ledger');

export interface LedgerEntry {
  timestamp: number;
  runId: string;
  projectId: string;
  chainId: string;
  type: string;
  actorId: string;
  actorType: string;
  payload: string;
  failureReason: string;
}

export function classifyFailureReason(event: RuntimeEvent): string {
  if (event.type !== 'run.failed' && !event.payload?.error) {
    return 'none';
  }
  const raw = String(event.payload?.error || event.payload?.reason || '').toLowerCase();
  if (raw.includes('auth') || raw.includes('unauthorized')) return 'auth_error';
  if (raw.includes('quota') || raw.includes('rate')) return 'quota_or_rate_limit';
  if (raw.includes('timeout')) return 'timeout';
  if (raw.includes('loop') || raw.includes('duplicate')) return 'loop_detected';
  return 'runtime_failure';
}

export async function appendRunLedger(event: RuntimeEvent): Promise<void> {
  await fs.mkdir(LEDGER_DIR, { recursive: true });
  const fileName = `${event.runId || 'unknown-run'}.jsonl`;
  const filePath = path.join(LEDGER_DIR, fileName);
  const line = JSON.stringify(event) + '\n';
  await fs.appendFile(filePath, line, 'utf-8').catch(err => {
    console.error(`[RunLedger] Failed to append to ledger ${filePath}:`, err.message);
  });
}

