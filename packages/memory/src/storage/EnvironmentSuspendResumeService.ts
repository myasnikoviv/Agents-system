import { transitionEnvironment, type EnvironmentState } from '@system/shared';
import { SqliteEnvironmentStateStore, type PersistedEnvironmentRecord } from './EnvironmentStateStore';

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
  constructor(private readonly store: SqliteEnvironmentStateStore) {}

  suspend(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): EnvironmentTransitionResult {
    return this.applyTransition(input.environment, 'suspended', input.actorId, input.reason || 'manual_suspend');
  }

  resume(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): EnvironmentTransitionResult {
    return this.applyTransition(input.environment, 'active', input.actorId, input.reason || 'manual_resume');
  }

  terminate(input: {
    environment: PersistedEnvironmentRecord;
    actorId?: string;
    reason?: string;
  }): EnvironmentTransitionResult {
    return this.applyTransition(input.environment, 'terminated', input.actorId, input.reason || 'manual_terminate');
  }

  private applyTransition(
    environment: PersistedEnvironmentRecord,
    targetState: EnvironmentState,
    actorId?: string,
    reason?: string,
  ): EnvironmentTransitionResult {
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

    const persisted = this.store.upsert({
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
