"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CostBreakdownService_1 = require("../cost/CostBreakdownService");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'cost-breakdown-'));
}
describe('CostBreakdownService', () => {
    it('aggregates per run, per agent, and per workspace', () => {
        const workspace = mkTmpWorkspace();
        const dir = path_1.default.join(workspace, 'docs/process/runs/cost');
        fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(dir, 'run-1.json'), JSON.stringify({
            runId: 'run-1',
            projectId: 'p1',
            workspaceId: 'w1',
            tokens: 100,
            toolExecutions: 1,
            runtimeSeconds: 2,
            monetary: {
                totalCostUsd: 1.2,
                byAgentUsd: { developer: 1.0, 'pm-orchestrator': 0.2 },
            },
        }, null, 2), 'utf-8');
        fs_1.default.writeFileSync(path_1.default.join(dir, 'run-2.json'), JSON.stringify({
            runId: 'run-2',
            projectId: 'p1',
            workspaceId: 'w1',
            tokens: 200,
            toolExecutions: 2,
            runtimeSeconds: 3,
            monetary: {
                totalCostUsd: 2.4,
                byAgentUsd: { developer: 2.0, 'tdd-qa': 0.4 },
            },
        }, null, 2), 'utf-8');
        const service = new CostBreakdownService_1.CostBreakdownService();
        const result = service.aggregate(workspace, { projectId: 'p1' });
        expect(result.perRun.length).toBe(2);
        expect(result.perAgent.developer).toBeCloseTo(3.0, 6);
        expect(result.perAgent['pm-orchestrator']).toBeCloseTo(0.2, 6);
        expect(result.perWorkspace.w1).toBeCloseTo(3.6, 6);
    });
});
