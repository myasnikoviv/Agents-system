"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
jest.mock('@system/governance', () => ({
    ...jest.requireActual('@system/governance'),
    logGovernance: () => undefined,
}));
const WorkbenchGateway_1 = require("../WorkbenchGateway");
const WorkbenchToolRegistry_1 = require("../WorkbenchToolRegistry");
const AgentWorkbenchScheduler_1 = require("../AgentWorkbenchScheduler");
function makeContext(agentSlug, workspacePath) {
    return {
        runId: `run-${Date.now()}-${agentSlug}`,
        threadId: 'thread-test',
        chainId: 'thread-scope-1',
        projectId: 'agent_system',
        tenantId: 'tenant-a',
        workspaceId: 'workspace-a',
        workspacePath,
        provider: 'openai',
        model: 'gpt-4o-mini',
        executionTarget: 'langchain',
        task: { rawUserInput: 'test', normalizedGoal: 'test', taskType: 'test' },
        pipeline: { id: 'test', title: 'test', currentStageId: 'stage', currentStageTitle: 'stage', stepIndex: 0, allowedNextStages: [] },
        agent: { slug: agentSlug, title: agentSlug, mission: 'test', instructions: '', skills: [] },
        artifacts: { priorOutputs: [] },
        memory: { threadHistory: [], sharedFacts: {}, runDecisions: {} },
        tools: [],
        outputContract: { responseMode: 'final', requiredSections: [], mustWriteArtifactLog: true, mustEmitEvent: true },
        guardrails: { allowedActions: [], blockedActions: [] },
        activeTicketId: 'AGSYS-2913',
        startTime: new Date().toISOString(),
    };
}
describe('Workbench scope model and access enforcement', () => {
    beforeEach(() => {
        (0, WorkbenchToolRegistry_1.resetWorkbenchToolRegistry)();
        (0, AgentWorkbenchScheduler_1.resetWorkbenchState)();
    });
    it('resolves workspace policy over global policy', () => {
        (0, WorkbenchToolRegistry_1.upsertWorkbenchToolPolicy)({
            id: 'read_file',
            type: 'parallel',
            allowedAgents: ['*'],
            risk: 'safe',
            scope: { level: 'global' },
        });
        (0, WorkbenchToolRegistry_1.upsertWorkbenchToolPolicy)({
            id: 'read_file',
            type: 'exclusive',
            allowedAgents: ['*'],
            risk: 'mutable',
            scope: { level: 'workspace', tenantId: 'tenant-a', workspaceId: 'workspace-a' },
        });
        const resolved = (0, WorkbenchToolRegistry_1.resolveWorkbenchToolPolicy)('read_file', {
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            sessionId: 'thread-scope-1',
        });
        expect(resolved?.type).toBe('exclusive');
        expect(resolved?.scope?.level).toBe('workspace');
    });
    it('blocks unsafe tool when policy is not isolated', async () => {
        (0, WorkbenchToolRegistry_1.upsertWorkbenchToolPolicy)({
            id: 'read_file',
            type: 'parallel',
            allowedAgents: ['*'],
            risk: 'unsafe',
            scope: { level: 'workspace', tenantId: 'tenant-a', workspaceId: 'workspace-a' },
        });
        const tmp = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'wb-scope-'));
        const file = path_1.default.join(tmp, 'note.txt');
        fs_1.default.writeFileSync(file, 'hello', 'utf-8');
        const result = await (0, WorkbenchGateway_1.executeViaWorkbench)('read_file', { path: file }, makeContext('agent-a', tmp));
        expect(result.status).toBe('blocked');
        expect(result.summary).toContain('unsafe tool must be isolated');
    });
});
