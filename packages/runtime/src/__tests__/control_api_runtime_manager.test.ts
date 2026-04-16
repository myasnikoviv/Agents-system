import { ControlApiRuntimeManager } from '../control-api/ControlApiRuntimeManager';
import type { ServiceExecutionAdapter } from '../control-api/adapters/ServiceExecutionAdapter';
import { ServiceExecutionAdapterRegistry } from '../control-api/adapters/ServiceExecutionAdapter';
import { ServiceLifecycleEventBus } from '../control-api/ServiceLifecycleEvents';
import fs from 'fs';
import os from 'os';
import path from 'path';

function createStubAdapter(adapterId: string): ServiceExecutionAdapter<any> {
  const state = new Map<string, any>();
  return {
    adapterId,
    async start(serviceId: string, spec: any) {
      const next = { 
        serviceId, 
        status: 'running' as const, 
        spec,
        pid: 1234,
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        exitCode: null,
        signal: null,
        crashReason: null,
        [Symbol.iterator]: undefined // Mocking it doesn't need iterator but needs index signature
      };
      state.set(serviceId, next);
      return next as any;
    },
    async stop(serviceId: string) {
      const next = { 
        serviceId, 
        status: 'stopped' as const,
        pid: null,
        startedAt: null,
        stoppedAt: new Date().toISOString(),
        exitCode: 0,
        signal: null,
        crashReason: null
      };
      state.set(serviceId, next);
      return next as any;
    },
    async restart(serviceId: string) {
      const next = { 
        serviceId, 
        status: 'running' as const, 
        restarted: true,
        pid: 1235,
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        exitCode: null,
        signal: null,
        crashReason: null
      };
      state.set(serviceId, next);
      return next as any;
    },
    getRuntime(serviceId: string) {
      return state.get(serviceId) || { 
        serviceId, 
        status: 'idle' as const,
        pid: null,
        startedAt: null,
        stoppedAt: null,
        exitCode: null,
        signal: null,
        crashReason: null
      };
    },
  };
}

describe('ControlApiRuntimeManager (AGSYS-2713)', () => {
  it('lists services and returns runtime-aware status', () => {
    const adapters = new ServiceExecutionAdapterRegistry();
    adapters.register(createStubAdapter('local-process'));
    adapters.register(createStubAdapter('docker'));
    const manager = new ControlApiRuntimeManager(
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
    const manager = new ControlApiRuntimeManager(
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
