import { SqliteEnvironmentStateStore, type PersistedEnvironmentRecord } from './EnvironmentStateStore';

export interface WarmupCheck {
  id: string;
  ok: boolean;
  detail?: string;
}

export interface WarmupResult {
  ok: boolean;
  environment: PersistedEnvironmentRecord;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  checks: WarmupCheck[];
  error?: string;
}

export class EnvironmentWarmupService {
  constructor(private readonly store: SqliteEnvironmentStateStore) {}

  async warmup(input: {
    environment: PersistedEnvironmentRecord;
    runChecks?: () => Promise<WarmupCheck[]>;
  }): Promise<WarmupResult> {
    const startedAt = new Date().toISOString();
    this.store.upsert({
      environmentId: input.environment.environmentId,
      tenantId: input.environment.tenantId,
      workspaceId: input.environment.workspaceId,
      projectId: input.environment.projectId,
      state: 'warming',
      lastActivityAt: startedAt,
    });

    try {
      const checks = input.runChecks ? await input.runChecks() : [];
      const failedCheck = checks.find((c) => !c.ok);
      if (failedCheck) {
        const finishedAt = new Date().toISOString();
        const failed = this.store.upsert({
          environmentId: input.environment.environmentId,
          tenantId: input.environment.tenantId,
          workspaceId: input.environment.workspaceId,
          projectId: input.environment.projectId,
          state: 'failed',
          lastActivityAt: finishedAt,
          lastError: failedCheck.detail || `warmup_check_failed:${failedCheck.id}`,
        });
        return {
          ok: false,
          environment: failed,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
          checks,
          error: failedCheck.detail || `warmup_check_failed:${failedCheck.id}`,
        };
      }

      const finishedAt = new Date().toISOString();
      const active = this.store.upsert({
        environmentId: input.environment.environmentId,
        tenantId: input.environment.tenantId,
        workspaceId: input.environment.workspaceId,
        projectId: input.environment.projectId,
        state: 'active',
        lastActivityAt: finishedAt,
      });
      return {
        ok: true,
        environment: active,
        startedAt,
        finishedAt,
        durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
        checks,
      };
    } catch (error: any) {
      const finishedAt = new Date().toISOString();
      const failed = this.store.upsert({
        environmentId: input.environment.environmentId,
        tenantId: input.environment.tenantId,
        workspaceId: input.environment.workspaceId,
        projectId: input.environment.projectId,
        state: 'failed',
        lastActivityAt: finishedAt,
        lastError: String(error?.message || 'warmup_failed'),
      });
      return {
        ok: false,
        environment: failed,
        startedAt,
        finishedAt,
        durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
        checks: [],
        error: String(error?.message || 'warmup_failed'),
      };
    }
  }
}
