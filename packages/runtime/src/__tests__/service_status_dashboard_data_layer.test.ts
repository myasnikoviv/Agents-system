import { buildServiceStatusDashboardSnapshot } from '../control-api/ServiceStatusDashboardDataLayer';
import type { ControlApiRuntimeManager } from '../control-api/ControlApiRuntimeManager';

describe('ServiceStatusDashboardDataLayer (AGSYS-2716)', () => {
  it('builds aggregated status, restart counts, health summary, and environment-aware snapshot', () => {
    const manager = {
      listServices: () => ['backend', 'redis', 'worker'],
      getStatus: (serviceId: string) => {
        if (serviceId === 'backend') return { serviceId, runtime: 'node', desired: 'running', state: { status: 'running', restartCount: 1 } };
        if (serviceId === 'redis') return { serviceId, runtime: 'docker', desired: 'running', state: { status: 'degraded', restartCount: 2 } };
        return { serviceId, runtime: 'node', desired: 'stopped', state: { status: 'stopped', restartCount: 0 } };
      },
    } as unknown as ControlApiRuntimeManager;

    const snapshot = buildServiceStatusDashboardSnapshot(manager);
    expect(snapshot.totals.total).toBe(3);
    expect(snapshot.totals.running).toBe(1);
    expect(snapshot.healthSummary.degraded).toBe(2);
    expect(snapshot.restartCounts.total).toBe(3);
    expect(snapshot.restartCounts.byService.backend).toBe(1);
    expect(snapshot.environment.profile).toBeTruthy();
  });
});
