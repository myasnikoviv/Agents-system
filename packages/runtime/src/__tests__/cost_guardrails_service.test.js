"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CostGuardrailsService_1 = require("../cost/CostGuardrailsService");
function mkWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'cost-guardrails-'));
}
function writeLedger(workspace, file, row) {
    const dir = path_1.default.join(workspace, 'docs/process/runs/cost');
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(dir, file), JSON.stringify(row, null, 2), 'utf-8');
}
describe('CostGuardrailsService', () => {
    it('returns warn near daily limit and block when exceeding tenant/day limits', () => {
        const workspace = mkWorkspace();
        const day = '2026-04-11';
        const policyPath = path_1.default.join(workspace, 'docs/runtime/cost/guardrails-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({
            defaultMaxCostUsdPerDay: 10,
            defaultMaxCostUsdPerTenantPerDay: 15,
            alertThresholdRatio: 0.9,
        }, null, 2), 'utf-8');
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
        const service = new CostGuardrailsService_1.CostGuardrailsService();
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
