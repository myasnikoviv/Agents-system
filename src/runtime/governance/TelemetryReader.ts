import fs from 'fs';
import path from 'path';
import { resolveRuntimePath } from '../RuntimePathResolver';

export interface TelemetrySnapshot {
  totalTokens: number;
  entries: number;
  hasSkillTelemetry: boolean;
}

export interface LoopPressureSnapshot {
  retries: number;
  governanceChecks: number;
}

export function readTelemetry(workspacePath: string, runId: string): TelemetrySnapshot {
  const ledgerFile = path.join(resolveRuntimePath(workspacePath, 'processLedgerDir'), `${runId}.jsonl`);
  let totalTokens = 0;
  let entries = 0;
  if (fs.existsSync(ledgerFile)) {
    const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        const t = Number(ev?.payload?.tokensInput || 0) + Number(ev?.payload?.tokensOutput || 0);
        totalTokens += Number.isFinite(t) ? t : 0;
        entries += 1;
      } catch {
        // ignore malformed lines
      }
    }
  }
  const skillTelemetryPath = resolveRuntimePath(workspacePath, 'processSkillTelemetryFile');
  return {
    totalTokens,
    entries,
    hasSkillTelemetry: fs.existsSync(skillTelemetryPath),
  };
}

export function readLoopPressure(workspacePath: string, runId: string): LoopPressureSnapshot {
  const ledgerFile = path.join(resolveRuntimePath(workspacePath, 'processLedgerDir'), `${runId}.jsonl`);
  let retries = 0;
  let governanceChecks = 0;
  if (fs.existsSync(ledgerFile)) {
    const lines = fs.readFileSync(ledgerFile, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        const type = String(ev?.type || '');
        if (type === 'guard.retry') retries += 1;
        if (type === 'governance.rule_check') governanceChecks += 1;
      } catch {
        // ignore malformed lines
      }
    }
  }
  return { retries, governanceChecks };
}
