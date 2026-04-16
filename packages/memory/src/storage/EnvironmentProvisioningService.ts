import { SqliteEnvironmentStateStore, buildPersistedEnvironmentId, type PersistedEnvironmentRecord } from './EnvironmentStateStore';

export interface ProvisionStep {
  state: 'provisioning' | 'warming' | 'active' | 'failed';
  timestamp: string;
  message: string;
}

export interface ProvisionResult {
  ok: boolean;
  environmentId: string;
  status: 'provisioned' | 'already_ready' | 'failed';
  environment: PersistedEnvironmentRecord;
  steps: ProvisionStep[];
  error?: string;
}

export class EnvironmentProvisioningService {
  constructor(private readonly store: SqliteEnvironmentStateStore) {}

  provisionOnDemand(input: {
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    actorId?: string;
    force?: boolean;
  }): ProvisionResult {
    const environmentId = buildPersistedEnvironmentId({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    });
    const existing = this.store.get(environmentId);
    const readyStates = new Set(['active', 'warming', 'idle', 'suspended']);
    if (existing && !input.force && readyStates.has(existing.state)) {
      return {
        ok: true,
        environmentId,
        status: 'already_ready',
        environment: existing,
        steps: [
          {
            state: existing.state === 'failed' ? 'failed' : existing.state === 'active' ? 'active' : 'warming',
            timestamp: new Date().toISOString(),
            message: `Environment already in ready state: ${existing.state}`,
          },
        ],
      };
    }

    const steps: ProvisionStep[] = [];
    const now1 = new Date().toISOString();
    this.store.upsert({
      environmentId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      state: 'provisioning',
      lastActivityAt: now1,
    });
    steps.push({ state: 'provisioning', timestamp: now1, message: 'Environment provisioning started' });

    try {
      const now2 = new Date().toISOString();
      this.store.upsert({
        environmentId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        state: 'warming',
        lastActivityAt: now2,
      });
      steps.push({ state: 'warming', timestamp: now2, message: 'Environment warmup phase started' });

      const now3 = new Date().toISOString();
      const environment = this.store.upsert({
        environmentId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        state: 'active',
        lastActivityAt: now3,
      });
      steps.push({ state: 'active', timestamp: now3, message: 'Environment is active' });

      return {
        ok: true,
        environmentId,
        status: 'provisioned',
        environment,
        steps,
      };
    } catch (error: any) {
      const failAt = new Date().toISOString();
      const failed = this.store.upsert({
        environmentId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        state: 'failed',
        lastActivityAt: failAt,
        lastError: String(error?.message || 'environment_provision_failed'),
      });
      steps.push({ state: 'failed', timestamp: failAt, message: 'Environment provisioning failed' });
      return {
        ok: false,
        environmentId,
        status: 'failed',
        environment: failed,
        steps,
        error: String(error?.message || 'environment_provision_failed'),
      };
    }
  }
}
