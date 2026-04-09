import fs from 'fs';
import path from 'path';
import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { scoreAgentPerformance } from './AgentPerformanceScoring';

export interface AgentScoreRow {
  agentSlug: string;
  score: number;
}

function collectTokenUsageByAgent(workspacePath: string, projectId: string): Record<string, number> {
  const out: Record<string, number> = {};
  const costDir = path.resolve(workspacePath, 'docs/process/runs/cost');
  if (!fs.existsSync(costDir)) return out;
  const files = fs.readdirSync(costDir).filter((name) => name.endsWith('.json')).sort().slice(-50);
  for (const name of files) {
    try {
      const row = JSON.parse(fs.readFileSync(path.join(costDir, name), 'utf-8'));
      if (String(row?.projectId || '') !== projectId) continue;
      const byAgent = row?.attribution?.byAgent || {};
      for (const [agentSlug, tokens] of Object.entries(byAgent)) {
        out[agentSlug] = (out[agentSlug] || 0) + Number(tokens || 0);
      }
    } catch {
      // ignore malformed file
    }
  }
  return out;
}

export function collectAgentPerformanceScores(input: {
  workspacePath: string;
  projectId: string;
  agentSlugs: string[];
}): AgentScoreRow[] {
  const tokenUsageByAgent = collectTokenUsageByAgent(input.workspacePath, input.projectId);
  const utilization = DynamicWorkerSpawnManager.utilizationSnapshot({ projectId: input.projectId });
  const utilizationByAgent = new Map(utilization.map((row) => [row.agentSlug, row]));

  return input.agentSlugs.map((agentSlug) => {
    const row: any = utilizationByAgent.get(agentSlug) || {};
    const scored = scoreAgentPerformance({
      agentSlug,
      invocationCount: Number(row.invocationCount || 0),
      successfulTaskCount: Number(row.successfulTaskCount || 0),
      failedTaskCount: Number(row.failedTaskCount || 0),
      retryTaskCount: Number(row.retryTaskCount || 0),
      avgTaskDurationMs: Number(row.avgTaskDurationMs || 0),
      tokenUsage: Number(tokenUsageByAgent[agentSlug] || 0),
    });
    return { agentSlug, score: scored.score };
  });
}

export function applyPerformanceFeedbackOrder(agentSlugs: string[], scoreRows: AgentScoreRow[]): string[] {
  const bySlug = new Map(scoreRows.map((row) => [row.agentSlug, row.score]));
  return [...agentSlugs].sort((a, b) => {
    const aScore = Number(bySlug.get(a) ?? 0);
    const bScore = Number(bySlug.get(b) ?? 0);
    if (bScore !== aScore) return bScore - aScore;
    return a.localeCompare(b);
  });
}
