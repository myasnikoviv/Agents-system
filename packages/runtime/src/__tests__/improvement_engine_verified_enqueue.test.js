"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../redisClient', () => ({
    getRedisClient: () => ({
        xadd: jest.fn(async () => 'job-1'),
    }),
}));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ImprovementEngine_1 = require("../improvement/ImprovementEngine");
describe('ImprovementEngine verified enqueue', () => {
    it('enqueues improvement job when proposal is verified', async () => {
        const workspace = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'improvement-verified-'));
        const proposalPath = path_1.default.join(workspace, 'proposal.json');
        fs_1.default.writeFileSync(proposalPath, JSON.stringify({ status: 'verified', verification: { status: 'verified', passed: true } }, null, 2), 'utf-8');
        const enqueued = await (0, ImprovementEngine_1.enqueueImprovementJob)({
            runId: 'run-verified',
            projectId: 'proj-a',
            chainId: 'chain-verified',
            workspacePath: workspace,
            signalsPath: path_1.default.join(workspace, 'signals.json'),
            ticketsPath: path_1.default.join(workspace, 'tickets.json'),
            proposalPath,
        });
        expect(enqueued).toBe('job-1');
    });
});
