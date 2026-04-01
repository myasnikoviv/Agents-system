import fs from 'fs';
import path from 'path';

export interface RunCostMetrics {
  runId: string;
  projectId: string;
  tokens: number;
  loops: number;
  retries: number;
  attribution: {
    byAgent: Record<string, number>;
    byStep: Record<string, number>;
  };
  breakdown: {
    execution: number;
    governance: number;
    compliance: number;
    other: number;
  };
}

interface CostPolicy {
  defaultHardTokenLimit?: number;
  byProject?: Record<string, { hardTokenLimit?: number }>;
}

function readLedgerEvents(workspacePath: string, runId: string): any[] {
  const file = path.resolve(workspacePath, 'docs/process/runs/ledger', `${runId}.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function loadCostPolicy(workspacePath: string): CostPolicy {
  const file = path.resolve(workspacePath, 'docs/runtime/cost/cost-policy.json');
  if (!fs.existsSync(file)) return { defaultHardTokenLimit: 120000, byProject: {} };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as CostPolicy;
  } catch {
    return { defaultHardTokenLimit: 120000, byProject: {} };
  }
}

export function collectRunCostMetrics(workspacePath: string, runId: string, projectId: string): RunCostMetrics {
  const events = readLedgerEvents(workspacePath, runId);
  let execution = 0;
  let governance = 0;
  let compliance = 0;
  let other = 0;
  let retries = 0;
  let loops = 0;
  const byAgent: Record<string, number> = {};
  const byStep: Record<string, number> = {};

  function addAttribution(target: Record<string, number>, key: string, tokens: number): void {
    const normalized = String(key || '').trim() || 'unknown';
    target[normalized] = (target[normalized] || 0) + tokens;
  }

  for (const e of events) {
    const type = String(e?.type || '');
    const payload = e?.payload || {};

    if (type === 'llm.response') {
      const tokens = Number(payload?.tokensInput || 0) + Number(payload?.tokensOutput || 0);
      const source = String(payload?.source || '').toLowerCase();
      const actorId = String(e?.actor?.id || payload?.agentId || source || 'unknown');
      const stepId = String(payload?.stageId || payload?.stepId || payload?.source || 'unknown');
      if (source === 'agent') execution += tokens;
      else if (source === 'guard') governance += tokens;
      else if (source === 'retry') compliance += tokens;
      else other += tokens;
      addAttribution(byAgent, actorId, tokens);
      addAttribution(byStep, stepId, tokens);
    }
    if (type === 'guard.retry') retries += 1;
    if (type === 'governance.rule_check') {
      loops += 1;
      const rule = String(payload?.rule || '').toLowerCase();
      if (rule.includes('compliance')) compliance += 0;
      else governance += 0;
    }
  }

  return {
    runId,
    projectId,
    tokens: execution + governance + compliance + other,
    loops,
    retries,
    attribution: {
      byAgent,
      byStep,
    },
    breakdown: { execution, governance, compliance, other },
  };
}

export function enforceHardCostLimit(metrics: RunCostMetrics, workspacePath: string): { allowed: boolean; threshold: number } {
  const policy = loadCostPolicy(workspacePath);
  const threshold =
    policy.byProject?.[metrics.projectId]?.hardTokenLimit ||
    policy.defaultHardTokenLimit ||
    120000;
  return { allowed: metrics.tokens <= threshold, threshold };
}

export function writeCostLedger(metrics: RunCostMetrics, workspacePath: string): string {
  const base = path.resolve(workspacePath, 'docs/process/runs/cost');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  const file = path.join(base, `${metrics.runId}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        ...metrics,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf-8',
  );
  return file;
}

export function decideAdaptiveOptimization(workspacePath: string, projectId: string): {
  lowRisk: boolean;
  suggestedMaxRetriesPerStep: number;
} {
  const dir = path.resolve(workspacePath, 'docs/process/runs/cost');
  if (!fs.existsSync(dir)) return { lowRisk: false, suggestedMaxRetriesPerStep: 1 };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).slice(-5);
  let totalRetries = 0;
  let count = 0;
  for (const f of files) {
    try {
      const row = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      if (String(row?.projectId || '') !== projectId) continue;
      totalRetries += Number(row?.retries || 0);
      count += 1;
    } catch {
      // ignore malformed files
    }
  }
  if (count === 0) return { lowRisk: false, suggestedMaxRetriesPerStep: 1 };
  const avgRetries = totalRetries / count;
  const lowRisk = avgRetries < 0.5;
  return { lowRisk, suggestedMaxRetriesPerStep: lowRisk ? 1 : 2 };
}
