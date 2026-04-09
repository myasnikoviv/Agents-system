import { LocalPlatformBootOrchestrator } from '../control-plane/LocalPlatformBootOrchestrator';
import type { ControlPlaneRuntimeManager } from '../control-plane/ControlPlaneRuntimeManager';

describe('LocalPlatformBootOrchestrator (AGSYS-2719)', () => {
  it('boots services via control plane in controlled order without shell orchestration', async () => {
    const started: string[] = [];
    const manager = {
      listServices: () => ['backend', 'redis', 'worker'],
      getDescriptor: (serviceId: string) => {
        if (serviceId === 'backend') return { metadata: { dependsOn: ['redis'] } };
        if (serviceId === 'worker') return { metadata: { dependsOn: ['backend'] } };
        return { metadata: {} };
      },
      getStatus: (serviceId: string) => {
        if (serviceId === 'redis') return { serviceId, runtime: 'docker', desired: 'running', state: { status: started.includes(serviceId) ? 'running' : 'stopped' } };
        return { serviceId, runtime: 'node', desired: 'running', state: { status: started.includes(serviceId) ? 'running' : 'stopped' } };
      },
      start: async (serviceId: string) => {
        started.push(serviceId);
        return {} as any;
      },
    } as unknown as ControlPlaneRuntimeManager;

    const orchestrator = new LocalPlatformBootOrchestrator(manager);
    const result = await orchestrator.bootAll();

    expect(result.success).toBe(true);
    // dependency-aware launch order
    expect(result.launchOrder).toEqual(['redis', 'backend', 'worker']);
    expect(result.services.every((s) => s.status === 'running')).toBe(true);
  });
});
