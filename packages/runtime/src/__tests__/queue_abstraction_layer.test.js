"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueueAbstractionLayer_1 = require("../queue/QueueAbstractionLayer");
const ProjectDispatchQueue_1 = require("../queue/ProjectDispatchQueue");
describe('QueueAbstractionLayer', () => {
    beforeEach(async () => {
        await QueueAbstractionLayer_1.QueueAbstractionLayer.clear();
    });
    it('supports enqueue -> dequeue -> ack lifecycle', async () => {
        const queued = await QueueAbstractionLayer_1.QueueAbstractionLayer.enqueue({
            runId: 'r1',
            projectId: 'proj-a',
            chainId: 'c1',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { priority: 3 },
        });
        expect(queued.taskId).toContain('proj-a:');
        const lease = await QueueAbstractionLayer_1.QueueAbstractionLayer.dequeue({
            projectId: 'proj-a',
            agentSlug: 'developer',
            consumerId: 'worker-1',
        });
        expect(lease?.task.taskId).toBe(queued.taskId);
        expect(QueueAbstractionLayer_1.QueueAbstractionLayer.inflightCount()).toBe(1);
        const acked = await QueueAbstractionLayer_1.QueueAbstractionLayer.ack(String(lease?.leaseId || ''));
        expect(acked).toBe(true);
        expect(QueueAbstractionLayer_1.QueueAbstractionLayer.inflightCount()).toBe(0);
    });
    it('supports nack with requeue and retry metadata', async () => {
        const queued = await QueueAbstractionLayer_1.QueueAbstractionLayer.enqueue({
            runId: 'r2',
            projectId: 'proj-a',
            chainId: 'c2',
            pipelineId: 'feature-change',
            stageId: 'qa',
            agentSlug: 'tdd-qa',
            payload: {},
        });
        const lease = await QueueAbstractionLayer_1.QueueAbstractionLayer.dequeue({
            projectId: 'proj-a',
            agentSlug: 'tdd-qa',
            consumerId: 'worker-qa-1',
        });
        expect(lease?.task.taskId).toBe(queued.taskId);
        const requeued = await QueueAbstractionLayer_1.QueueAbstractionLayer.nack({
            leaseId: String(lease?.leaseId || ''),
            reason: 'transient_failure',
        });
        expect(requeued?.taskId).toBeTruthy();
        expect(requeued?.payload?.retryCount).toBe(1);
        expect(requeued?.payload?.retryOfTaskId).toBe(queued.taskId);
        expect(await QueueAbstractionLayer_1.QueueAbstractionLayer.depth('proj-a', 'tdd-qa')).toBe(1);
    });
    it('supports priority update via abstraction API', async () => {
        const task = await ProjectDispatchQueue_1.ProjectDispatchQueue.enqueueAsync({
            runId: 'r3',
            projectId: 'proj-a',
            chainId: 'c3',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { priority: 0 },
        });
        const updated = await QueueAbstractionLayer_1.QueueAbstractionLayer.setPriority({
            projectId: 'proj-a',
            taskId: task.taskId,
            priority: 50,
            actorId: 'tester',
        });
        expect(updated?.payload?.priority).toBe(50);
        const lease = await QueueAbstractionLayer_1.QueueAbstractionLayer.dequeue({
            projectId: 'proj-a',
            agentSlug: 'developer',
            consumerId: 'worker-dev-1',
        });
        expect(lease?.task.taskId).toBe(task.taskId);
    });
    it('supports DLQ lifecycle via abstraction API', async () => {
        const queued = await QueueAbstractionLayer_1.QueueAbstractionLayer.enqueue({
            runId: 'r4',
            projectId: 'proj-a',
            chainId: 'c4',
            pipelineId: 'feature-change',
            stageId: 'dev',
            agentSlug: 'developer',
            payload: { retryCount: 5 },
        });
        const dlq = await QueueAbstractionLayer_1.QueueAbstractionLayer.toDlq({
            task: queued,
            reason: 'retry_budget_exhausted',
            retriesExhausted: 5,
            actorId: 'runtime-test',
        });
        expect(dlq.dlqId).toBeTruthy();
        const dlqList = await QueueAbstractionLayer_1.QueueAbstractionLayer.listDlq('proj-a');
        expect(dlqList.length).toBe(1);
        expect(dlqList[0]?.dlqId).toBe(dlq.dlqId);
        const requeued = await QueueAbstractionLayer_1.QueueAbstractionLayer.requeueDlq({
            projectId: 'proj-a',
            dlqId: dlq.dlqId,
            actorId: 'tester',
        });
        expect(requeued?.taskId).toBeTruthy();
        expect(requeued?.payload?.requeuedFromDlqId).toBe(dlq.dlqId);
    });
});
