"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ImprovementEngine_1 = require("../improvement/ImprovementEngine");
describe('ImprovementEngine verification gate', () => {
    it('does not enqueue improvement job when proposal is not verified', async () => {
        const workspace = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'improvement-gate-'));
        const proposalPath = path_1.default.join(workspace, 'proposal.json');
        fs_1.default.writeFileSync(proposalPath, JSON.stringify({ status: 'proposed', verification: { status: 'pending', passed: false } }, null, 2), 'utf-8');
        const enqueued = await (0, ImprovementEngine_1.enqueueImprovementJob)({
            runId: 'run-1',
            projectId: 'proj-a',
            chainId: 'chain-1',
            workspacePath: workspace,
            signalsPath: path_1.default.join(workspace, 'signals.json'),
            ticketsPath: path_1.default.join(workspace, 'tickets.json'),
            proposalPath,
        });
        expect(enqueued).toBeNull();
    });
});
