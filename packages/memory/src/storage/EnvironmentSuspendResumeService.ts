import { transitionEnvironment, type EnvironmentState } from '@system/shared';
import { type EnvironmentStateStore, type PersistedEnvironmentRecord } from './EnvironmentStateStore';

export interface EnvironmentTransitionResult {
  ok: boolean;
  environment: PersistedEnvironmentRecord;
  from: EnvironmentState;
  to: EnvironmentState;
  timestamp: string;
  reason?: string;
  error?: string;
}

export class EnvironmentSuspendResumeService {
  constructor(private readonly store: EnvironmentStateStore) {}

  async suspend(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): Promise<EnvironmentTransitionResult> {
    return this.applyTransition(input.environment, 'suspended', input.actorId, input.reason || 'manual_suspend');
  }

  async resume(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): Promise<EnvironmentTransitionResult> {
    return this.applyTransition(input.environment, 'active', input.actorId, input.reason || 'manual_resume');
  }

  async terminate(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): Promise<EnvironmentTransitionResult> {
    return this.applyTransition(input.environment, 'terminated', input.actorId, input.reason || 'manual_terminate');
  }

  private async applyTransition(
    environment: PersistedEnvironmentRecord,
    targetState: EnvironmentState,
    actorId?: string,
    reason?: string,
  ): Promise<EnvironmentTransitionResult> {
    const transitioned = transitionEnvironment(
      {
        environmentId: environment.environmentId,
        tenantId: environment.tenantId,
        workspaceId: environment.workspaceId,
        ...(environment.projectId ? { projectId: environment.projectId } : {}),
        state: environment.state,
        updatedAt: environment.updatedAt,
      },
      targetState,
      { actorId, reason },
    );

    if ('error' in transitioned) {
      return {
        ok: false,
        environment,
        from: environment.state,
        to: targetState,
        timestamp: new Date().toISOString(),
        reason,
        error: transitioned.error,
      };
    }

    const persisted = await this.store.upsert({
      environmentId: environment.environmentId,
      tenantId: environment.tenantId,
      workspaceId: environment.workspaceId,
      projectId: environment.projectId,
      state: transitioned.next.state,
      lastActivityAt: transitioned.next.updatedAt,
    });

    return {
      ok: true,
      environment: persisted,
      from: environment.state,
      to: transitioned.next.state,
      timestamp: transitioned.event.timestamp,
      reason: transitioned.event.reason,
    };
  }
}
