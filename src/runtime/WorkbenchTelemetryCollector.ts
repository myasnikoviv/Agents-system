import fs from 'fs';
import path from 'path';

export interface WorkbenchTelemetryEntry {
  ts: string;
  runId: string;
  projectId: string;
  agentId: string;
  toolId: string;
  action: 'request' | 'acquired' | 'queued' | 'blocked' | 'executed' | 'released' | 'failed';
  status: 'success' | 'failed';
  detail?: string;
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function appendWorkbenchTelemetry(entry: Omit<WorkbenchTelemetryEntry, 'ts'>): WorkbenchTelemetryEntry {
  const full: WorkbenchTelemetryEntry = {
    ...entry,
    ts: new Date().toISOString(),
  };
  const base = path.resolve(process.cwd(), 'docs/process/runs/workbench');
  ensureDir(base);
  const file = path.join(base, `${entry.runId}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(full) + '\n', 'utf-8');
  return full;
}
