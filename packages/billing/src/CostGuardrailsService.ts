import fs from 'fs';
import path from 'path';

interface CostLedgerRow {
  projectId?: string;
  workspaceId?: string;
  timestamp?: string;
  monetary?: {
    totalCostUsd?: number;
  };
}

interface GuardrailsPolicy {
  defaultMaxCostUsdPerDay?: number;
  defaultMaxCostUsdPerTenantPerDay?: number;
  alertThresholdRatio?: number;
  byProject?: Record<string, { maxCostUsdPerDay?: number }>;
  byWorkspace?: Record<string, { maxCostUsdPerDay?: number }>;
}

export interface CostGuardrailsFilter {
  projectId?: string;
  workspaceId?: string;
  dayIsoDate?: string;
}

export interface CostGuardrailsResult {
  status: 'ok' | 'warn' | 'block';
  scope: {
    projectId: string;
    workspaceId: string;
    dayIsoDate: string;
  };
  totals: {
    dayCostUsd: number;
    tenantDayCostUsd: number;
  };
  limits: {
    dayLimitUsd: number;
    tenantDayLimitUsd: number;
    alertThresholdRatio: number;
  };
  alerts: Array<{
    code: 'cost_day_near_limit' | 'cost_day_exceeded' | 'cost_tenant_day_exceeded' | 'anomaly_usage_spike';
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}

function loadPolicy(workspacePath: string): GuardrailsPolicy {
  const file = path.resolve(workspacePath, 'docs/runtime/cost/guardrails-policy.json');
  if (!fs.existsSync(file)) {
    return {
      defaultMaxCostUsdPerDay: 10,
      defaultMaxCostUsdPerTenantPerDay: 40,
      alertThresholdRatio: 0.9,
      byProject: {},
      byWorkspace: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as GuardrailsPolicy;
  } catch {
    return {
      defaultMaxCostUsdPerDay: 10,
      defaultMaxCostUsdPerTenantPerDay: 40,
      alertThresholdRatio: 0.9,
      byProject: {},
      byWorkspace: {},
    };
  }
}

function readRows(workspacePath: string): CostLedgerRow[] {
  const dir = path.resolve(workspacePath, 'docs/process/runs/cost');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as CostLedgerRow;
      } catch {
        return null;
      }
    })
    .filter((row): row is CostLedgerRow => Boolean(row));
}

function dayOf(value: string | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export class CostGuardrailsService {
  evaluate(workspacePath: string, filter: CostGuardrailsFilter = {}): CostGuardrailsResult {
    const projectId = String(filter.projectId || '').trim() || 'default';
    const workspaceId = String(filter.workspaceId || '').trim() || 'workspace:default';
    const dayIsoDate = String(filter.dayIsoDate || '').trim() || new Date().toISOString().slice(0, 10);
    const policy = loadPolicy(workspacePath);
    const alertThresholdRatioRaw = Number(policy.alertThresholdRatio ?? 0.9);
    const alertThresholdRatio = Math.max(0.5, Math.min(0.99, alertThresholdRatioRaw));
    const dayLimitUsd = Number(policy.byProject?.[projectId]?.maxCostUsdPerDay ?? policy.defaultMaxCostUsdPerDay ?? 10);
    const tenantDayLimitUsd = Number(
      policy.byWorkspace?.[workspaceId]?.maxCostUsdPerDay ?? policy.defaultMaxCostUsdPerTenantPerDay ?? 40,
    );

    const rows = readRows(workspacePath);
    const byDay = rows.filter((row) => dayOf(row.timestamp) === dayIsoDate);
    const projectRows = byDay.filter((row) => String(row.projectId || 'default') === projectId);
    const workspaceRows = byDay.filter((row) => String(row.workspaceId || 'workspace:default') === workspaceId);
    const dayCostUsd = projectRows.reduce((acc, row) => acc + Number(row.monetary?.totalCostUsd || 0), 0);
    const tenantDayCostUsd = workspaceRows.reduce((acc, row) => acc + Number(row.monetary?.totalCostUsd || 0), 0);

    const alerts: CostGuardrailsResult['alerts'] = [];
    let status: CostGuardrailsResult['status'] = 'ok';

    if (dayCostUsd >= dayLimitUsd * alertThresholdRatio && dayCostUsd < dayLimitUsd) {
      status = 'warn';
      alerts.push({
        code: 'cost_day_near_limit',
        severity: 'warning',
        message: `Project daily cost is near limit (${dayCostUsd.toFixed(4)} / ${dayLimitUsd.toFixed(4)} USD).`,
      });
    }
    if (dayCostUsd >= dayLimitUsd) {
      status = 'block';
      alerts.push({
        code: 'cost_day_exceeded',
        severity: 'critical',
        message: `Project daily cost limit exceeded (${dayCostUsd.toFixed(4)} / ${dayLimitUsd.toFixed(4)} USD).`,
      });
    }
    if (tenantDayCostUsd >= tenantDayLimitUsd) {
      status = 'block';
      alerts.push({
        code: 'cost_tenant_day_exceeded',
        severity: 'critical',
        message: `Tenant daily cost limit exceeded (${tenantDayCostUsd.toFixed(4)} / ${tenantDayLimitUsd.toFixed(4)} USD).`,
      });
    }

    const latest = projectRows
      .slice()
      .sort((a, b) => new Date(String(b.timestamp || 0)).getTime() - new Date(String(a.timestamp || 0)).getTime())[0];
    const projectCosts = projectRows.map((row) => Number(row.monetary?.totalCostUsd || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (latest && projectCosts.length >= 3) {
      const latestCost = Number(latest.monetary?.totalCostUsd || 0);
      const baseline = projectCosts.slice(0, -1);
      const average = baseline.length > 0 ? baseline.reduce((acc, n) => acc + n, 0) / baseline.length : 0;
      if (average > 0 && latestCost >= average * 2.2) {
        if (status === 'ok') status = 'warn';
        alerts.push({
          code: 'anomaly_usage_spike',
          severity: 'warning',
          message: `Latest run cost spike detected (${latestCost.toFixed(4)} USD vs baseline ${average.toFixed(4)} USD).`,
        });
      }
    }

    return {
      status,
      scope: { projectId, workspaceId, dayIsoDate },
      totals: { dayCostUsd, tenantDayCostUsd },
      limits: { dayLimitUsd, tenantDayLimitUsd, alertThresholdRatio },
      alerts,
    };
  }
}
