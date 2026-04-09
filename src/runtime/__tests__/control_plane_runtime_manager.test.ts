import { ControlPlaneRuntimeManager } from '../control-plane/ControlPlaneRuntimeManager';
import type { ServiceExecutionAdapter } from '../control-plane/adapters/ServiceExecutionAdapter';
import { ServiceExecutionAdapterRegistry } from '../control-plane/adapters/ServiceExecutionAdapter';
import { ServiceLifecycleEventBus } from '../control-plane/ServiceLifecycleEvents';
import fs from 'fs';
import os from 'os';
import path from 'path';

function createStubAdapter(adapterId: string): ServiceExecutionAdapter<any> {
  const state = new Map<string, any>();
  return {
    adapterId,
    async start(serviceId: string, spec: any) {
      const next = { serviceId, status: 'running', spec };
      state.set(serviceId, next);
      return next;
    },
    async stop(serviceId: string) {
      const next = { serviceId, status: 'stopped' };
      state.set(serviceId, next);
      return next;
    },
    async restart(serviceId: string) {
      const next = { serviceId, status: 'running', restarted: true };
      state.set(serviceId, next);
      return next;
    },
    getRuntime(serviceId: string) {
      return state.get(serviceId) || { serviceId, status: 'idle' };
    },
  };
}

describe('ControlPlaneRuntimeManager (AGSYS-2713)', () => {
  it('lists services and returns runtime-aware status', () => {
    const adapters = new ServiceExecutionAdapterRegistry();
    adapters.register(createStubAdapter('local-process'));
    adapters.register(createStubAdapter('docker'));
    const manager = new ControlPlaneRuntimeManager(
      {
        schemaVersion: 'service-registry.v1',
        services: {
          backend: { type: 'api', runtime: 'node', desired: { state: 'running' }, entrypoint: process.execPath },
          redis: { type: 'infra', runtime: 'docker', desired: { state: 'running' }, metadata: { image: 'redis:7-alpine' } },
        },
      },
      adapters,
    );

    expect(manager.listServices()).toEqual(['backend', 'redis']);
    expect(manager.getStatus('backend').desired).toBe('running');
  });

  it('supports start/stop/restart actions', async () => {
    const adapters = new ServiceExecutionAdapterRegistry();
    const events = new ServiceLifecycleEventBus(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'manager-events-')), 'events.jsonl'));
    adapters.register(createStubAdapter('local-process'));
    adapters.register(createStubAdapter('docker'));
    const manager = new ControlPlaneRuntimeManager(
      {
        schemaVersion: 'service-registry.v1',
        services: {
          backend: { type: 'api', runtime: 'node', desired: { state: 'running' }, entrypoint: process.execPath },
        },
      },
      adapters,
      events,
    );

    const started = await manager.start('backend', { source: 'api', actorId: 'admin-1' });
    expect((started.state as any).status).toBe('running');

    const restarted = await manager.restart('backend');
    expect((restarted.state as any).status).toBe('running');

    const stopped = await manager.stop('backend', { source: 'api', actorId: 'admin-1' });
    expect((stopped.state as any).status).toBe('stopped');

    const lifecycle = manager.listLifecycleEvents();
    expect(lifecycle.some((e) => e.kind === 'service.started' && e.serviceId === 'backend')).toBe(true);
    expect(lifecycle.some((e) => e.kind === 'service.restarted' && e.serviceId === 'backend')).toBe(true);
    expect(lifecycle.some((e) => e.kind === 'service.stopped' && e.serviceId === 'backend')).toBe(true);
    expect(lifecycle.some((e) => e.actorId === 'admin-1')).toBe(true);
  });
});
