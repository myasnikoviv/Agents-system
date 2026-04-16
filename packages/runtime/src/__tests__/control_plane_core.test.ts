import fs from 'fs';
import os from 'os';
import path from 'path';
import { ControlPlaneCore } from '../control-plane/ControlPlaneCore';
import { SqliteServiceStateStore } from '../control-plane/ServiceStateStore';

describe('ControlPlaneCore (AGSYS-2703)', () => {
  it('initializes service state model from registry', () => {
    const core = new ControlPlaneCore({
      schemaVersion: 'service-registry.v1',
      services: {
        backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
        redis: { type: 'infra', runtime: 'docker', desired: { state: 'stopped' } },
      },
    });

    expect(core.listServiceIds()).toEqual(['backend', 'redis']);
    expect(core.getState('backend').status).toBe('starting');
    expect(core.getState('redis').status).toBe('stopped');
  });

  it('updates runtime status and tracks restart count', () => {
    const core = new ControlPlaneCore({
      schemaVersion: 'service-registry.v1',
      services: {
        backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
      },
    });

    core.setStatus({ serviceId: 'backend', status: 'healthy' });
    const failed = core.setStatus({
      serviceId: 'backend',
      status: 'failed',
      errorReason: 'crash',
      incrementRestart: true,
    });

    expect(failed.status).toBe('failed');
    expect(failed.errorReason).toBe('crash');
    expect(failed.restartCount).toBe(1);
  });

  it('loads registry from file through loader integration', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-core-'));
    const file = path.join(tmpDir, 'registry.yaml');
    fs.writeFileSync(
      file,
      [
        'schemaVersion: service-registry.v1',
        'services:',
        '  runtime-dispatcher:',
        '    type: worker',
        '    runtime: node',
        '    desired: running',
      ].join('\n'),
      'utf-8',
    );

    const core = ControlPlaneCore.fromRegistryPath(file);
    const snapshot = core.snapshot();
    expect(snapshot.services.length).toBe(1);
    expect(snapshot.services[0].serviceId).toBe('runtime-dispatcher');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('restores persisted service state from external store', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-core-store-'));
    const dbPath = path.join(tmpDir, 'state.db');
    const store = new SqliteServiceStateStore(dbPath);

    const coreA = new ControlPlaneCore(
      {
        schemaVersion: 'service-registry.v1',
        services: {
          backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
        },
      },
      { stateStore: store },
    );
    coreA.setStatus({
      serviceId: 'backend',
      status: 'failed',
      errorReason: 'crash',
      incrementRestart: true,
    });

    const coreB = new ControlPlaneCore(
      {
        schemaVersion: 'service-registry.v1',
        services: {
          backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
        },
      },
      { stateStore: new SqliteServiceStateStore(dbPath) },
    );

    const restored = coreB.getState('backend');
    expect(restored.status).toBe('failed');
    expect(restored.restartCount).toBe(1);
    expect(restored.errorReason).toBe('crash');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
