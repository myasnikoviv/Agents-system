import { emitEvent } from '../events/EventBus';

interface HandoffInput {
  runId: string;
  projectId: string;
  chainId: string;
  pipelineId: string;
  fromAgentId: string;
  toAgentId: string;
  toStageId: string;
  toStageTitle: string;
}

interface SharedStateScope {
  projectId: string;
  chainId: string;
  fromAgentId: string;
  toAgentId: string;
}

const sharedState = new Map<string, Record<string, any>>();

function scopeKey(scope: SharedStateScope): string {
  return `${scope.projectId}:${scope.chainId}:${scope.fromAgentId}:${scope.toAgentId}`;
}

export class InterAgentCommunication {
  static async publishHandoff(input: HandoffInput): Promise<void> {
    await emitEvent({
      type: 'swarm.handoff',
      runId: input.runId,
      projectId: input.projectId,
      chainId: input.chainId,
      actor: { type: 'system', id: 'inter-agent-event-bus' },
      payload: {
        pipelineId: input.pipelineId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        toStageId: input.toStageId,
        toStageTitle: input.toStageTitle,
      },
    });
  }

  static writeSharedState(scope: SharedStateScope, data: Record<string, any>): void {
    const key = scopeKey(scope);
    const prev = sharedState.get(key) || {};
    sharedState.set(key, { ...prev, ...data });
  }

  static readSharedState(scope: SharedStateScope): Record<string, any> {
    return { ...(sharedState.get(scopeKey(scope)) || {}) };
  }

  static clearSharedState(): void {
    sharedState.clear();
  }
}

