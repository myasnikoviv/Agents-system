import fs from 'fs';
import path from 'path';

export interface ChainPruningPolicy {
  dedupeByStageId?: boolean;
  dedupeConsecutiveByAgent?: boolean;
  dropDisabledStages?: boolean;
  maxStagesPerRun?: number;
}

export interface ChainPruningResult {
  stages: any[];
  beforeCount: number;
  afterCount: number;
  prunedCount: number;
  estimatedLlmCallsBefore: number;
  estimatedLlmCallsAfter: number;
  measurableImprovementPct: number;
  reasons: string[];
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function loadPolicy(workspacePath: string): ChainPruningPolicy {
  return readJson<ChainPruningPolicy>(
    path.resolve(workspacePath, 'docs/runtime/adaptive/chain-optimization-policy.json'),
    {
      dedupeByStageId: true,
      dedupeConsecutiveByAgent: true,
      dropDisabledStages: true,
      maxStagesPerRun: 12,
    },
  );
}

function stageId(stage: any): string {
  return String(stage?.id || '').trim();
}

function stageAgent(stage: any): string {
  return String(stage?.agent || stage?.role || '').trim() || 'system-core';
}

export function pruneExecutionChain(input: {
  workspacePath: string;
  stages: any[];
  maxStagesOverride?: number;
}): ChainPruningResult {
  const policy = loadPolicy(input.workspacePath);
  const reasons: string[] = [];
  const before = Array.isArray(input.stages) ? [...input.stages] : [];
  let next = [...before];

  if (policy.dropDisabledStages) {
    const prev = next.length;
    next = next.filter((s) => s?.enabled !== false);
    if (next.length !== prev) reasons.push('drop_disabled_stages');
  }

  if (policy.dedupeByStageId) {
    const seen = new Set<string>();
    const prev = next.length;
    next = next.filter((s) => {
      const id = stageId(s);
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (next.length !== prev) reasons.push('dedupe_by_stage_id');
  }

  if (policy.dedupeConsecutiveByAgent) {
    const prev = next.length;
    const compact: any[] = [];
    for (const s of next) {
      const last = compact.length ? compact[compact.length - 1] : null;
      if (last && stageAgent(last) === stageAgent(s)) continue;
      compact.push(s);
    }
    next = compact;
    if (next.length !== prev) reasons.push('dedupe_consecutive_by_agent');
  }

  const maxStages = Math.max(1, Number(input.maxStagesOverride || policy.maxStagesPerRun || 12));
  if (next.length > maxStages) {
    next = next.slice(0, maxStages);
    reasons.push(`max_stages_cap:${maxStages}`);
  }

  const beforeCount = before.length;
  const afterCount = next.length;
  const prunedCount = Math.max(0, beforeCount - afterCount);
  const estimatedLlmCallsBefore = beforeCount;
  const estimatedLlmCallsAfter = afterCount;
  const measurableImprovementPct =
    beforeCount > 0 ? Number((((beforeCount - afterCount) / beforeCount) * 100).toFixed(2)) : 0;

  return {
    stages: next,
    beforeCount,
    afterCount,
    prunedCount,
    estimatedLlmCallsBefore,
    estimatedLlmCallsAfter,
    measurableImprovementPct,
    reasons,
  };
}

export function writeChainPruningReport(
  workspacePath: string,
  runId: string,
  payload: Omit<ChainPruningResult, 'stages'> & { pipelineId: string },
): string {
  const dir = path.resolve(workspacePath, 'docs/process/runs/optimization');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${runId}.chain-pruning.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        runId,
        ...payload,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf-8',
  );
  return file;
}
