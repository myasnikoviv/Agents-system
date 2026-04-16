import fs from 'fs';
import path from 'path';

export interface RunCostMetrics {
  runId: string;
  projectId: string;
  tokens: number;
  toolExecutions: number;
  runtimeSeconds: number;
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
  monetary: {
    currency: string;
    rates: {
      per1kTokensUsd: number;
      perToolExecutionUsd: number;
      perRuntimeSecondUsd: number;
    };
    tokenCostUsd: number;
    toolCostUsd: number;
    runtimeCostUsd: number;
    totalCostUsd: number;
    byAgentUsd: Record<string, number>;
    byStepUsd: Record<string, number>;
    breakdownUsd: {
      execution: number;
      governance: number;
      compliance: number;
      other: number;
    };
  };
}

interface CostPolicy {
  defaultHardTokenLimit?: number;
  currency?: string;
  rates?: {
    per1kTokensUsd?: number;
    perToolExecutionUsd?: number;
    perRuntimeSecondUsd?: number;
  };
  byProject?: Record<
    string,
    {
      hardTokenLimit?: number;
      rates?: {
        per1kTokensUsd?: number;
        perToolExecutionUsd?: number;
        perRuntimeSecondUsd?: number;
      };
    }
  >;
}

interface BudgetPolicy {
  defaultMaxCostUsdPerRun?: number;
  defaultSoftDegradeRatio?: number;
  byProject?: Record<
    string,
    {
      maxCostUsdPerRun?: number;
      softDegradeRatio?: number;
    }
  >;
}

export interface CostAggregationResult {
  runs: number;
  totals: {
    tokens: number;
    toolExecutions: number;
    runtimeSeconds: number;
    totalCostUsd: number;
  };
  byProject: Record<
    string,
    {
      runs: number;
      tokens: number;
      toolExecutions: number;
      runtimeSeconds: number;
      totalCostUsd: number;
    }
  >;
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

function loadBudgetPolicy(workspacePath: string): BudgetPolicy {
  const file = path.resolve(workspacePath, 'docs/runtime/cost/budget-policy.json');
  if (!fs.existsSync(file)) {
    return {
      defaultMaxCostUsdPerRun: 5,
      defaultSoftDegradeRatio: 0.8,
      byProject: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as BudgetPolicy;
  } catch {
    return {
      defaultMaxCostUsdPerRun: 5,
      defaultSoftDegradeRatio: 0.8,
      byProject: {},
    };
  }
}

export function collectRunCostMetrics(workspacePath: string, runId: string, projectId: string): RunCostMetrics {
  const events = readLedgerEvents(workspacePath, runId);
  const policy = loadCostPolicy(workspacePath);
  const projectPolicy = policy.byProject?.[projectId];
  const per1kTokensUsd = Number(projectPolicy?.rates?.per1kTokensUsd ?? policy.rates?.per1kTokensUsd ?? 0.01);
  const perToolExecutionUsd = Number(projectPolicy?.rates?.perToolExecutionUsd ?? policy.rates?.perToolExecutionUsd ?? 0.001);
  const perRuntimeSecondUsd = Number(projectPolicy?.rates?.perRuntimeSecondUsd ?? policy.rates?.perRuntimeSecondUsd ?? 0.0001);
  const currency = String(policy.currency || 'USD');

  let execution = 0;
  let governance = 0;
  let compliance = 0;
  let other = 0;
  let usageTokenTotal = 0;
  let usageToolExecutions = 0;
  let usageRuntimeSeconds = 0;
  let fallbackToolExecutions = 0;
  let fallbackRuntimeMs = 0;
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
      fallbackRuntimeMs += Number(payload?.durationMs || 0);
    }
    if (type === 'usage.token_usage') usageTokenTotal += Number(payload?.quantity || 0);
    if (type === 'usage.tool_execution') usageToolExecutions += Number(payload?.quantity || 0);
    if (type === 'usage.runtime_time') {
      const quantity = Number(payload?.quantity || 0);
      const unit = String(payload?.unit || 'seconds').toLowerCase();
      if (unit.startsWith('ms')) usageRuntimeSeconds += quantity / 1000;
      else if (unit.startsWith('min')) usageRuntimeSeconds += quantity * 60;
      else usageRuntimeSeconds += quantity;
    }
    if (type === 'tool.result') fallbackToolExecutions += 1;
    if (type === 'guard.retry') retries += 1;
    if (type === 'governance.rule_check') {
      loops += 1;
      const rule = String(payload?.rule || '').toLowerCase();
      if (rule.includes('compliance')) compliance += 0;
      else governance += 0;
    }
  }

  const llmTokenTotal = execution + governance + compliance + other;
  const totalTokens = usageTokenTotal > 0 ? usageTokenTotal : llmTokenTotal;
  const toolExecutions = usageToolExecutions > 0 ? usageToolExecutions : fallbackToolExecutions;
  const runtimeSeconds = usageRuntimeSeconds > 0 ? usageRuntimeSeconds : fallbackRuntimeMs / 1000;

  const tokenCostUsd = (totalTokens / 1000) * per1kTokensUsd;
  const toolCostUsd = toolExecutions * perToolExecutionUsd;
  const runtimeCostUsd = runtimeSeconds * perRuntimeSecondUsd;
  const totalCostUsd = tokenCostUsd + toolCostUsd + runtimeCostUsd;

  const byAgentUsd: Record<string, number> = {};
  const byStepUsd: Record<string, number> = {};
  const tokenDenominator = totalTokens > 0 ? totalTokens : 0;
  if (tokenDenominator > 0) {
    for (const [agentId, agentTokens] of Object.entries(byAgent)) {
      const ratio = Number(agentTokens || 0) / tokenDenominator;
      byAgentUsd[agentId] = totalCostUsd * ratio;
    }
    for (const [stepId, stepTokens] of Object.entries(byStep)) {
      const ratio = Number(stepTokens || 0) / tokenDenominator;
      byStepUsd[stepId] = totalCostUsd * ratio;
    }
  } else {
    byAgentUsd.unknown = totalCostUsd;
    byStepUsd.unknown = totalCostUsd;
  }

  const breakdownUsd = {
    execution: tokenDenominator > 0 ? totalCostUsd * (execution / tokenDenominator) : 0,
    governance: tokenDenominator > 0 ? totalCostUsd * (governance / tokenDenominator) : 0,
    compliance: tokenDenominator > 0 ? totalCostUsd * (compliance / tokenDenominator) : 0,
    other: tokenDenominator > 0 ? totalCostUsd * (other / tokenDenominator) : 0,
  };

  return {
    runId,
    projectId,
    tokens: totalTokens,
    toolExecutions,
    runtimeSeconds,
    loops,
    retries,
    attribution: {
      byAgent,
      byStep,
    },
    breakdown: { execution, governance, compliance, other },
    monetary: {
      currency,
      rates: {
        per1kTokensUsd,
        perToolExecutionUsd,
        perRuntimeSecondUsd,
      },
      tokenCostUsd,
      toolCostUsd,
      runtimeCostUsd,
      totalCostUsd,
      byAgentUsd,
      byStepUsd,
      breakdownUsd,
    },
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

export function enforceBudgetConstraints(
  metrics: RunCostMetrics,
  workspacePath: string,
): {
  allowed: boolean;
  softExceeded: boolean;
  softThresholdUsd: number;
  hardThresholdUsd: number;
  reason: string;
} {
  const policy = loadBudgetPolicy(workspacePath);
  const perProject = policy.byProject?.[metrics.projectId];
  const hardThresholdUsd = Number(
    perProject?.maxCostUsdPerRun ?? policy.defaultMaxCostUsdPerRun ?? 5,
  );
  const softRatioRaw = Number(perProject?.softDegradeRatio ?? policy.defaultSoftDegradeRatio ?? 0.8);
  const softRatio = Math.max(0.1, Math.min(0.99, softRatioRaw));
  const softThresholdUsd = hardThresholdUsd * softRatio;
  const totalCostUsd = Number(metrics.monetary?.totalCostUsd || 0);

  if (totalCostUsd > hardThresholdUsd) {
    return {
      allowed: false,
      softExceeded: true,
      softThresholdUsd,
      hardThresholdUsd,
      reason: `hard_budget_exceeded:${totalCostUsd.toFixed(6)}>${hardThresholdUsd.toFixed(6)}`,
    };
  }

  if (totalCostUsd > softThresholdUsd) {
    return {
      allowed: true,
      softExceeded: true,
      softThresholdUsd,
      hardThresholdUsd,
      reason: `soft_budget_exceeded:${totalCostUsd.toFixed(6)}>${softThresholdUsd.toFixed(6)}`,
    };
  }

  return {
    allowed: true,
    softExceeded: false,
    softThresholdUsd,
    hardThresholdUsd,
    reason: 'budget_ok',
  };
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

export function aggregateCostLedgers(
  workspacePath: string,
  filter?: { projectId?: string },
): CostAggregationResult {
  const dir = path.resolve(workspacePath, 'docs/process/runs/cost');
  const result: CostAggregationResult = {
    runs: 0,
    totals: {
      tokens: 0,
      toolExecutions: 0,
      runtimeSeconds: 0,
      totalCostUsd: 0,
    },
    byProject: {},
  };
  if (!fs.existsSync(dir)) return result;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const projectFilter = String(filter?.projectId || '').trim();
  for (const file of files) {
    try {
      const row = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const projectId = String(row?.projectId || '').trim() || 'unknown';
      if (projectFilter && projectId !== projectFilter) continue;

      const tokens = Number(row?.tokens || 0);
      const toolExecutions = Number(row?.toolExecutions || 0);
      const runtimeSeconds = Number(row?.runtimeSeconds || 0);
      const totalCostUsd = Number(row?.monetary?.totalCostUsd || 0);

      result.runs += 1;
      result.totals.tokens += tokens;
      result.totals.toolExecutions += toolExecutions;
      result.totals.runtimeSeconds += runtimeSeconds;
      result.totals.totalCostUsd += totalCostUsd;

      if (!result.byProject[projectId]) {
        result.byProject[projectId] = {
          runs: 0,
          tokens: 0,
          toolExecutions: 0,
          runtimeSeconds: 0,
          totalCostUsd: 0,
        };
      }
      result.byProject[projectId].runs += 1;
      result.byProject[projectId].tokens += tokens;
      result.byProject[projectId].toolExecutions += toolExecutions;
      result.byProject[projectId].runtimeSeconds += runtimeSeconds;
      result.byProject[projectId].totalCostUsd += totalCostUsd;
    } catch {
      // ignore malformed rows
    }
  }
  return result;
}
