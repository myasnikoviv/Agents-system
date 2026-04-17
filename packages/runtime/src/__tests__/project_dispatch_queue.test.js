"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectDispatchQueue_1 = require("../queue/ProjectDispatchQueue");
describe('ProjectDispatchQueue', () => {
    beforeEach(async () => {
        ProjectDispatchQueue_1.ProjectDispatchQueue.clear();
        await ProjectDispatchQueue_1.ProjectDispatchQueue.clearAsync();
    });
    it('keeps project and agent scoped queues isolated', () => {
        ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r1',
            projectId: 'proj-a',
            chainId: 'c1',
            pipelineId: 'unified-task-intake',
            stageId: '1',
            agentSlug: 'developer',
        });
        ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r2',
            projectId: 'proj-b',
            chainId: 'c2',
            pipelineId: 'unified-task-intake',
            stageId: '1',
            agentSlug: 'developer',
        });
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a')).toBe(1);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-b')).toBe(1);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(1);
    });
    it('supports enqueue -> pickup flow', () => {
        const queued = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r3',
            projectId: 'proj-a',
            chainId: 'c3',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { x: 1 },
        });
        const picked = ProjectDispatchQueue_1.ProjectDispatchQueue.pickup('proj-a', 'developer');
        expect(picked?.taskId).toBe(queued.taskId);
        expect(picked?.payload?.idempotencyKey).toBe(queued.taskId);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(0);
    });
    it('supports worker pull dispatch metadata', () => {
        const queued = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r3w',
            projectId: 'proj-a',
            chainId: 'c3w',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { x: 1 },
        });
        const pulled = ProjectDispatchQueue_1.ProjectDispatchQueue.pickupForWorker('proj-a', 'developer', 'worker-developer-1');
        expect(pulled?.taskId).toBe(queued.taskId);
        expect(pulled?.payload?.dispatchMode).toBe('worker_pull');
        expect(pulled?.payload?.pulledByWorkerId).toBe('worker-developer-1');
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(0);
    });
    it('reassigns queued task to another agent with trace payload', () => {
        const queued = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r4',
            projectId: 'proj-a',
            chainId: 'c4',
            pipelineId: 'feature-change',
            stageId: 'qa',
            agentSlug: 'tdd-qa',
            payload: { foo: 'bar' },
        });
        const reassigned = ProjectDispatchQueue_1.ProjectDispatchQueue.reassignTask({
            projectId: 'proj-a',
            taskId: queued.taskId,
            toAgentSlug: 'developer',
            actorId: 'tester',
        });
        expect(reassigned?.agentSlug).toBe('developer');
        expect(reassigned?.payload?.reassignedFromAgent).toBe('tdd-qa');
        expect(reassigned?.payload?.reassignedFromTaskId).toBe(queued.taskId);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'tdd-qa')).toBe(0);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(1);
    });
    it('retries task with incremented retry counter and link to original task', () => {
        const queued = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r5',
            projectId: 'proj-a',
            chainId: 'c5',
            pipelineId: 'bug-fix',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { retryCount: 1 },
        });
        const retry = ProjectDispatchQueue_1.ProjectDispatchQueue.retryTask({
            projectId: 'proj-a',
            taskId: queued.taskId,
            actorId: 'tester',
        });
        expect(retry?.agentSlug).toBe('developer');
        expect(retry?.payload?.retryCount).toBe(2);
        expect(retry?.payload?.retryOfTaskId).toBe(queued.taskId);
        expect(retry?.payload?.idempotencyKey).toBe(queued.taskId);
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(2);
    });
    it('defers pickup while retryNotBefore is in the future', async () => {
        await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r-backoff-1',
            projectId: 'proj-a',
            chainId: 'c-backoff-1',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: {
                retryCount: 1,
                retryNotBefore: Date.now() + 60_000,
            },
        });
        const early = await ProjectDispatchQueue_1.ProjectDispatchQueue.pickupForWorkerAsync('proj-a', 'developer', 'worker-backoff');
        expect(early).toBeNull();
    });
    it('lists queued tasks in enqueue order', () => {
        const first = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r6',
            projectId: 'proj-a',
            chainId: 'c6',
            pipelineId: 'unified-task-intake',
            stageId: '1',
            agentSlug: 'pm-orchestrator',
        });
        const second = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r7',
            projectId: 'proj-a',
            chainId: 'c7',
            pipelineId: 'unified-task-intake',
            stageId: '2',
            agentSlug: 'developer',
        });
        const rows = ProjectDispatchQueue_1.ProjectDispatchQueue.listTasks('proj-a');
        expect(rows.length).toBe(2);
        expect(rows[0]?.taskId).toBe(first.taskId);
        expect(rows[1]?.taskId).toBe(second.taskId);
    });
    it('cancels queued task and removes it from queue', () => {
        const task = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r8',
            projectId: 'proj-a',
            chainId: 'c8',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
        });
        const cancelled = ProjectDispatchQueue_1.ProjectDispatchQueue.cancelTask({
            projectId: 'proj-a',
            taskId: task.taskId,
            actorId: 'tester',
        });
        expect(cancelled?.taskId).toBe(task.taskId);
        expect(cancelled?.payload?.status).toBe('cancelled');
        expect(ProjectDispatchQueue_1.ProjectDispatchQueue.depth('proj-a', 'developer')).toBe(0);
    });
    it('overrides task priority and reorders dispatch deterministically', () => {
        const low = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r9',
            projectId: 'proj-a',
            chainId: 'c9',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { priority: 0 },
        });
        const high = ProjectDispatchQueue_1.ProjectDispatchQueue.enqueue({
            runId: 'r10',
            projectId: 'proj-a',
            chainId: 'c10',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { priority: 1 },
        });
        const raised = ProjectDispatchQueue_1.ProjectDispatchQueue.setTaskPriority({
            projectId: 'proj-a',
            taskId: low.taskId,
            priority: 50,
            actorId: 'tester',
        });
        expect(raised?.payload?.priority).toBe(50);
        const firstPickup = ProjectDispatchQueue_1.ProjectDispatchQueue.pickup('proj-a', 'developer');
        expect(firstPickup?.taskId).toBe(low.taskId);
        const secondPickup = ProjectDispatchQueue_1.ProjectDispatchQueue.pickup('proj-a', 'developer');
        expect(secondPickup?.taskId).toBe(high.taskId);
    });
    it('supports async queue API with sqlite default', async () => {
        const queued = await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r11',
            projectId: 'proj-a',
            chainId: 'c11',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { source: 'async-test' },
        });
        expect(queued.taskId).toContain('proj-a:env-global:developer:');
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer')).toBe(1);
        const pulled = await ProjectDispatchQueue_1.ProjectDispatchQueue.pickupForWorkerAsync('proj-a', 'developer', 'worker-1');
        expect(pulled?.taskId).toBe(queued.taskId);
        expect(pulled?.payload?.pulledByWorkerId).toBe('worker-1');
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer')).toBe(0);
    });
    it('filters worker pickup by environmentId', async () => {
        await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r11-env-a',
            projectId: 'proj-a',
            chainId: 'c11-env-a',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { environmentId: 'env-a' },
        });
        await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r11-env-b',
            projectId: 'proj-a',
            chainId: 'c11-env-b',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { environmentId: 'env-b' },
        });
        const pulled = await ProjectDispatchQueue_1.ProjectDispatchQueue.pickupForWorkerAsync('proj-a', 'developer', 'worker-env-a', {
            environmentId: 'env-a',
        });
        expect(pulled?.payload?.environmentId).toBe('env-a');
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer', { environmentId: 'env-a' })).toBe(0);
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer', { environmentId: 'env-b' })).toBe(1);
    });
    it('keeps parallel environment-scoped claims isolated under load', async () => {
        const scopeA = {
            environmentId: 'env:tenant-a:workspace-a:project-shared',
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
        };
        const scopeB = {
            environmentId: 'env:tenant-b:workspace-b:project-shared',
            tenantId: 'tenant-b',
            workspaceId: 'workspace-b',
        };
        const enqueueBatch = async (scope, prefix) => {
            for (let i = 0; i < 10; i += 1) {
                await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
                    runId: `${prefix}-run-${i}`,
                    projectId: 'proj-a',
                    chainId: `${prefix}-chain-${i}`,
                    pipelineId: 'feature-change',
                    stageId: 'dev',
                    agentSlug: 'developer',
                    payload: {
                        ...scope,
                        marker: `${prefix}-${i}`,
                    },
                });
            }
        };
        await Promise.all([enqueueBatch(scopeA, 'a'), enqueueBatch(scopeB, 'b')]);
        const pullAll = async (environmentId, workerPrefix) => {
            const markers = [];
            for (let i = 0; i < 10; i += 1) {
                const pulled = await ProjectDispatchQueue_1.ProjectDispatchQueue.pickupForWorkerAsync('proj-a', 'developer', `${workerPrefix}-${i}`, {
                    environmentId,
                });
                expect(pulled).toBeTruthy();
                markers.push(String(pulled?.payload?.marker || ''));
                expect(String(pulled?.payload?.environmentId || '')).toBe(environmentId);
            }
            return markers;
        };
        const [markersA, markersB] = await Promise.all([
            pullAll(scopeA.environmentId, 'worker-a'),
            pullAll(scopeB.environmentId, 'worker-b'),
        ]);
        expect(markersA.every((m) => m.startsWith('a-'))).toBe(true);
        expect(markersB.every((m) => m.startsWith('b-'))).toBe(true);
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer')).toBe(0);
    });
    it('supports async control APIs with sqlite default', async () => {
        const queued = await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r12',
            projectId: 'proj-a',
            chainId: 'c12',
            pipelineId: 'feature-change',
            stageId: 'qa',
            agentSlug: 'tdd-qa',
            payload: { priority: 0 },
        });
        const reassigned = await ProjectDispatchQueue_1.ProjectDispatchQueue.reassignTaskAsync({
            projectId: 'proj-a',
            taskId: queued.taskId,
            toAgentSlug: 'developer',
            actorId: 'tester',
        });
        expect(reassigned?.agentSlug).toBe('developer');
        const prioritized = await ProjectDispatchQueue_1.ProjectDispatchQueue.setTaskPriorityAsync({
            projectId: 'proj-a',
            taskId: String(reassigned?.taskId || ''),
            priority: 42,
            actorId: 'tester',
        });
        expect(prioritized?.payload?.priority).toBe(42);
        const retry = await ProjectDispatchQueue_1.ProjectDispatchQueue.retryTaskAsync({
            projectId: 'proj-a',
            taskId: String(reassigned?.taskId || ''),
            actorId: 'tester',
        });
        expect(retry?.taskId).toBeTruthy();
        const listed = await ProjectDispatchQueue_1.ProjectDispatchQueue.listTasksAsync('proj-a');
        expect(listed.length).toBeGreaterThanOrEqual(2);
        const snap = await ProjectDispatchQueue_1.ProjectDispatchQueue.snapshotAsync('proj-a');
        expect(Number(snap['proj-a:env-global:developer'] || 0)).toBeGreaterThanOrEqual(2);
        const cancelled = await ProjectDispatchQueue_1.ProjectDispatchQueue.cancelTaskAsync({
            projectId: 'proj-a',
            taskId: String(reassigned?.taskId || ''),
            actorId: 'tester',
        });
        expect(cancelled?.payload?.status).toBe('cancelled');
        const cleared = await ProjectDispatchQueue_1.ProjectDispatchQueue.clearProjectAsync('proj-a');
        expect(cleared).toBeGreaterThanOrEqual(1);
    });
    it('moves exhausted task to DLQ and allows manual requeue', async () => {
        const queued = await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r-dlq-1',
            projectId: 'proj-a',
            chainId: 'c-dlq-1',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { retryCount: 3 },
        });
        const dlq = await ProjectDispatchQueue_1.ProjectDispatchQueue.moveToDlqAsync({
            task: queued,
            reason: 'retry_budget_exhausted',
            retriesExhausted: 3,
            actorId: 'runtime-test',
        });
        expect(dlq.dlqId).toBeTruthy();
        expect(dlq.sourceTaskId).toBe(queued.taskId);
        expect(dlq.failureReason).toBe('retry_budget_exhausted');
        const list = await ProjectDispatchQueue_1.ProjectDispatchQueue.listDlqAsync('proj-a');
        expect(list.length).toBe(1);
        expect(list[0]?.dlqId).toBe(dlq.dlqId);
        const requeued = await ProjectDispatchQueue_1.ProjectDispatchQueue.requeueDlqAsync({
            projectId: 'proj-a',
            dlqId: dlq.dlqId,
            actorId: 'tester',
        });
        expect(requeued?.taskId).toBeTruthy();
        expect(requeued?.payload?.requeuedFromDlqId).toBe(dlq.dlqId);
        const listAfter = await ProjectDispatchQueue_1.ProjectDispatchQueue.listDlqAsync('proj-a');
        expect(listAfter.length).toBe(0);
        expect(await ProjectDispatchQueue_1.ProjectDispatchQueue.depthAsync('proj-a', 'developer')).toBeGreaterThanOrEqual(1);
    });
});
