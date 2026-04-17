import fs from 'fs';
import path from 'path';
import { ComplianceEvaluationResult } from './ComplianceTypes';
import { ComplianceEnforcementDecision } from './ComplianceEnforcementLoop';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeComplianceLedger(
  result: ComplianceEvaluationResult,
  decision: ComplianceEnforcementDecision,
  workspacePath: string,
): string {
  const base = path.resolve(workspacePath, 'docs/process/runs/compliance');
  ensureDir(base);
  const file = path.join(base, `${result.runId}.jsonl`);
  const entry = {
    ts: new Date().toISOString(),
    runId: result.runId,
    plan: result.plan,
    actual: result.actual,
    deviations: result.results.filter((r) => r.verdict === 'fail'),
    decision,
  };
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8');
  return file;
}
