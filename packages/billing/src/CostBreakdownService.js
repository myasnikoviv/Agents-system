"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostBreakdownService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readLedgerRows(workspacePath) {
    const dir = path_1.default.resolve(workspacePath, 'docs/process/runs/cost');
    if (!fs_1.default.existsSync(dir))
        return [];
    const files = fs_1.default.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const rows = [];
    for (const file of files) {
        try {
            rows.push(JSON.parse(fs_1.default.readFileSync(path_1.default.join(dir, file), 'utf-8')));
        }
        catch {
            // ignore malformed rows
        }
    }
    return rows;
}
class CostBreakdownService {
    aggregate(workspacePath, filter = {}) {
        const runId = String(filter.runId || '').trim();
        const projectId = String(filter.projectId || '').trim();
        const workspaceIdFilter = String(filter.workspaceId || '').trim();
        const limit = Math.max(1, Math.min(1000, Number(filter.limit || 100)));
        const perAgent = {};
        const perWorkspace = {};
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
            perWorkspace[row.workspaceId] = Number(perWorkspace[row.workspaceId] || 0) + totalCostUsd;
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
exports.CostBreakdownService = CostBreakdownService;
