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
  taskId?: string;
}

interface SharedStateScope {
  projectId: string;
  chainId: string;
  fromAgentId: string;
  toAgentId: string;
}

const sharedState = new Map<string, Record<string, any>>();
const handoffLedger: Array<Record<string, any>> = [];

function scopeKey(scope: SharedStateScope): string {
  return `${scope.projectId}:${scope.chainId}:${scope.fromAgentId}:${scope.toAgentId}`;
}

export class InterAgentCommunication {
  static async publishHandoff(input: HandoffInput): Promise<{ handoffId: string; handedOffAt: string }> {
    const handedOffAt = new Date().toISOString();
    const handoffId = `handoff:${input.runId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    handoffLedger.push({
      handoffId,
      handedOffAt,
      runId: input.runId,
      projectId: input.projectId,
      chainId: input.chainId,
      pipelineId: input.pipelineId,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      toStageId: input.toStageId,
      taskId: String(input.taskId || '').trim() || null,
    });
    await emitEvent({
      type: 'swarm.handoff',
      runId: input.runId,
      projectId: input.projectId,
      chainId: input.chainId,
      actor: { type: 'system', id: 'inter-agent-event-bus' },
      payload: {
        handoffId,
        handedOffAt,
        pipelineId: input.pipelineId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        toStageId: input.toStageId,
        toStageTitle: input.toStageTitle,
        taskId: String(input.taskId || '').trim() || null,
      },
    });
    return { handoffId, handedOffAt };
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
    handoffLedger.length = 0;
  }

  static listHandoffs(): Array<Record<string, any>> {
    return [...handoffLedger];
  }
}
