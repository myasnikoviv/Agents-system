import fs from 'fs';
import path from 'path';

export interface TelemetrySnapshot {
  totalTokens: number;
  entries: number;
  hasSkillTelemetry: boolean;
}

export function readTelemetry(workspacePath: string, runId: string): TelemetrySnapshot {
  const ledgerFile = path.resolve(workspacePath, 'docs/process/runs/ledger', `${runId}.jsonl`);
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
  const skillTelemetryPath = path.resolve(workspacePath, 'docs/process/skills/telemetry/skill-usage.jsonl');
  return {
    totalTokens,
    entries,
    hasSkillTelemetry: fs.existsSync(skillTelemetryPath),
  };
}
