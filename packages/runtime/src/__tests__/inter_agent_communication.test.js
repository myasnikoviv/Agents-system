"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('@system/events', () => ({
    emitEvent: jest.fn(async () => undefined),
}));
const events_1 = require("@system/events");
const InterAgentCommunication_1 = require("../workers/InterAgentCommunication");
describe('InterAgentCommunication', () => {
    beforeEach(() => {
        events_1.emitEvent.mockClear();
        InterAgentCommunication_1.InterAgentCommunication.clearSharedState();
    });
    it('publishes handoff only via event bus payload', async () => {
        const handoff = await InterAgentCommunication_1.InterAgentCommunication.publishHandoff({
            runId: 'r1',
            projectId: 'proj-a',
            chainId: 'chain-a',
            pipelineId: 'feature-change',
            fromAgentId: 'pm-orchestrator',
            toAgentId: 'developer',
            toStageId: 'dev',
            toStageTitle: 'Development',
            taskId: 'task-123',
        });
        expect(events_1.emitEvent).toHaveBeenCalledTimes(1);
        const call = events_1.emitEvent.mock.calls[0]?.[0];
        expect(call.type).toBe('swarm.handoff');
        expect(call.payload.handoffId).toBe(handoff.handoffId);
        expect(call.payload.handedOffAt).toBe(handoff.handedOffAt);
        expect(call.payload.fromAgentId).toBe('pm-orchestrator');
        expect(call.payload.toAgentId).toBe('developer');
        expect(call.payload.taskId).toBe('task-123');
        expect(InterAgentCommunication_1.InterAgentCommunication.listHandoffs().length).toBe(1);
    });
    it('supports controlled shared state read/write by scoped channel', () => {
        const scope = {
            projectId: 'proj-a',
            chainId: 'chain-a',
            fromAgentId: 'solution-architect',
            toAgentId: 'developer',
        };
        InterAgentCommunication_1.InterAgentCommunication.writeSharedState(scope, { handoffTicket: 'AGSYS-3207', stage: 'dev' });
        InterAgentCommunication_1.InterAgentCommunication.writeSharedState(scope, { note: 'ready' });
        const snapshot = InterAgentCommunication_1.InterAgentCommunication.readSharedState(scope);
        expect(snapshot.handoffTicket).toBe('AGSYS-3207');
        expect(snapshot.stage).toBe('dev');
        expect(snapshot.note).toBe('ready');
    });
});
