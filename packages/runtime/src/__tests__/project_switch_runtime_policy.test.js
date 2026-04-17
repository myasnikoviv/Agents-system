"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectSwitchRuntimePolicy_1 = require("../policy/ProjectSwitchRuntimePolicy");
const DynamicWorkerSpawnManager_1 = require("../workers/DynamicWorkerSpawnManager");
const ProjectDispatchQueue_1 = require("../queue/ProjectDispatchQueue");
const AgentIdentity_1 = require("../identity/AgentIdentity");
describe('ProjectSwitchRuntimePolicy', () => {
    beforeEach(() => {
        DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.clear();
        ProjectDispatchQueue_1.ProjectDispatchQueue.clear();
        (0, AgentIdentity_1.clearIdentityRegistry)();
    });
    it('keeps active project and cleans idle workers/queues for inactive projects', async () => {
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' }, { emitEvents: false });
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.ensureWorker({ runId: 'r2', projectId: 'proj-b', chainId: 'c2', agentSlug: 'developer' }, { emitEvents: false });
        await DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.releaseToStandby({ runId: 'r2', projectId: 'proj-b', chainId: 'c2', agentSlug: 'developer' }, { emitEvents: false });
        ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r2',
            projectId: 'proj-b',
            chainId: 'c2',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
        });
        const result = await (0, ProjectSwitchRuntimePolicy_1.applyProjectSwitchRuntimePolicy)({
            activeProjectId: 'proj-a',
            knownProjectIds: ['proj-a', 'proj-b'],
        });
        expect(result.cleanedProjects).toContain('proj-b');
        expect(result.removedQueuedTasks).toBeGreaterThanOrEqual(1);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-b')).toBe(0);
        expect(DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.snapshot().some((w) => w.projectId === 'proj-b')).toBe(false);
        expect(DynamicWorkerSpawnManager_1.DynamicWorkerSpawnManager.snapshot().some((w) => w.projectId === 'proj-a')).toBe(true);
    });
});
