jest.mock('../events/EventBus', () => ({
  emitEvent: jest.fn(async () => undefined),
}));

import { emitEvent } from '../events/EventBus';
import { InterAgentCommunication } from '../workers/InterAgentCommunication';

describe('InterAgentCommunication', () => {
  beforeEach(() => {
    (emitEvent as jest.Mock).mockClear();
    InterAgentCommunication.clearSharedState();
  });

  it('publishes handoff only via event bus payload', async () => {
    await InterAgentCommunication.publishHandoff({
      runId: 'r1',
      projectId: 'proj-a',
      chainId: 'chain-a',
      pipelineId: 'feature-change',
      fromAgentId: 'pm-orchestrator',
      toAgentId: 'developer',
      toStageId: 'dev',
      toStageTitle: 'Development',
    });

    expect(emitEvent).toHaveBeenCalledTimes(1);
    const call = (emitEvent as jest.Mock).mock.calls[0]?.[0];
    expect(call.type).toBe('swarm.handoff');
    expect(call.payload.fromAgentId).toBe('pm-orchestrator');
    expect(call.payload.toAgentId).toBe('developer');
  });

  it('supports controlled shared state read/write by scoped channel', () => {
    const scope = {
      projectId: 'proj-a',
      chainId: 'chain-a',
      fromAgentId: 'solution-architect',
      toAgentId: 'developer',
    };
    InterAgentCommunication.writeSharedState(scope, { handoffTicket: 'AGSYS-3207', stage: 'dev' });
    InterAgentCommunication.writeSharedState(scope, { note: 'ready' });

    const snapshot = InterAgentCommunication.readSharedState(scope);
    expect(snapshot.handoffTicket).toBe('AGSYS-3207');
    expect(snapshot.stage).toBe('dev');
    expect(snapshot.note).toBe('ready');
  });
});

