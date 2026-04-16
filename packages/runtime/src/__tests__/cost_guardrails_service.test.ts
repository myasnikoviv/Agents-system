import fs from 'fs';
import os from 'os';
import path from 'path';
import { CostGuardrailsService } from '../cost/CostGuardrailsService';

function mkWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cost-guardrails-'));
}

function writeLedger(workspace: string, file: string, row: Record<string, any>): void {
  const dir = path.join(workspace, 'docs/process/runs/cost');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(row, null, 2), 'utf-8');
}

describe('CostGuardrailsService', () => {
  it('returns warn near daily limit and block when exceeding tenant/day limits', () => {
    const workspace = mkWorkspace();
    const day = '2026-04-11';
    const policyPath = path.join(workspace, 'docs/runtime/cost/guardrails-policy.json');
    fs.mkdirSync(path.dirname(policyPath), { recursive: true });
    fs.writeFileSync(
      policyPath,
      JSON.stringify(
        {
          defaultMaxCostUsdPerDay: 10,
          defaultMaxCostUsdPerTenantPerDay: 15,
          alertThresholdRatio: 0.9,
        },
        null,
        2,
      ),
      'utf-8',
    );

    writeLedger(workspace, 'run-a.json', {
      projectId: 'project-a',
      workspaceId: 'tenant-x',
      timestamp: `${day}T10:00:00.000Z`,
      monetary: { totalCostUsd: 9.2 },
    });
    writeLedger(workspace, 'run-b.json', {
      projectId: 'project-b',
      workspaceId: 'tenant-x',
      timestamp: `${day}T11:00:00.000Z`,
      monetary: { totalCostUsd: 8 },
    });

    const service = new CostGuardrailsService();
    const result = service.evaluate(workspace, {
      projectId: 'project-a',
      workspaceId: 'tenant-x',
      dayIsoDate: day,
    });

    expect(result.status).toBe('block');
    expect(result.alerts.some((a) => a.code === 'cost_day_near_limit')).toBe(true);
    expect(result.alerts.some((a) => a.code === 'cost_tenant_day_exceeded')).toBe(true);
    expect(result.totals.dayCostUsd).toBeCloseTo(9.2, 6);
    expect(result.totals.tenantDayCostUsd).toBeCloseTo(17.2, 6);
  });
});
