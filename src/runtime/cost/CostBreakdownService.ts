import fs from 'fs';
import path from 'path';

export interface CostBreakdownFilter {
  runId?: string;
  projectId?: string;
  workspaceId?: string;
  limit?: number;
}

interface CostLedgerRow {
  runId: string;
  projectId: string;
  workspaceId?: string;
  monetary?: {
    totalCostUsd?: number;
    byAgentUsd?: Record<string, number>;
  };
  tokens?: number;
  toolExecutions?: number;
  runtimeSeconds?: number;
}

export interface CostBreakdownResult {
  perRun: Array<{
    runId: string;
    projectId: string;
    workspaceId: string;
    totalCostUsd: number;
    tokens: number;
    toolExecutions: number;
    runtimeSeconds: number;
  }>;
  perAgent: Record<string, number>;
  perWorkspace: Record<string, number>;
}

function readLedgerRows(workspacePath: string): CostLedgerRow[] {
  const dir = path.resolve(workspacePath, 'docs/process/runs/cost');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows: CostLedgerRow[] = [];
  for (const file of files) {
    try {
      rows.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as CostLedgerRow);
    } catch {
      // ignore malformed rows
    }
  }
  return rows;
}

export class CostBreakdownService {
  aggregate(workspacePath: string, filter: CostBreakdownFilter = {}): CostBreakdownResult {
    const runId = String(filter.runId || '').trim();
    const projectId = String(filter.projectId || '').trim();
    const workspaceIdFilter = String(filter.workspaceId || '').trim();
    const limit = Math.max(1, Math.min(1000, Number(filter.limit || 100)));

    const perAgent: Record<string, number> = {};
    const perWorkspace: Record<string, number> = {};

    const filtered = readLedgerRows(workspacePath)
      .filter((row) => (runId ? String(row.runId || '') === runId : true))
      .filter((row) => (projectId ? String(row.projectId || '') === projectId : true))
      .map((row) => {
        const rowWorkspaceId = String(row.workspaceId || workspaceIdFilter || 'workspace:default');
        return { ...row, workspaceId: rowWorkspaceId };
      })
      .filter((row) => (workspaceIdFilter ? String(row.workspaceId || '') === workspaceIdFilter : true))
      .slice(-limit);

    const perRun = filtered.map((row) => {
      const totalCostUsd = Number(row.monetary?.totalCostUsd || 0);
      const byAgentUsd = row.monetary?.byAgentUsd || {};
      for (const [agent, amount] of Object.entries(byAgentUsd)) {
        perAgent[String(agent || 'unknown')] = Number(perAgent[String(agent || 'unknown')] || 0) + Number(amount || 0);
      }
      perWorkspace[row.workspaceId!] = Number(perWorkspace[row.workspaceId!] || 0) + totalCostUsd;
      return {
        runId: String(row.runId || ''),
        projectId: String(row.projectId || ''),
        workspaceId: String(row.workspaceId || 'workspace:default'),
        totalCostUsd,
        tokens: Number(row.tokens || 0),
        toolExecutions: Number(row.toolExecutions || 0),
        runtimeSeconds: Number(row.runtimeSeconds || 0),
      };
    });

    return { perRun, perAgent, perWorkspace };
  }
}
