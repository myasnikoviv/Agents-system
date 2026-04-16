import fs from 'fs';
import os from 'os';
import path from 'path';
import { ControlApiCore } from '../control-api/ControlApiCore';
import { SqliteServiceStateStore } from '../control-api/ServiceStateStore';

describe('ControlApiCore (AGSYS-2703)', () => {
  it('initializes service state model from registry', () => {
    const core = new ControlApiCore({
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
    const core = new ControlApiCore({
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
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-api-core-'));
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

    const core = ControlApiCore.fromRegistryPath(file);
    const snapshot = core.snapshot();
    expect(snapshot.services.length).toBe(1);
    expect(snapshot.services[0].serviceId).toBe('runtime-dispatcher');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('restores persisted service state from external store', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-api-core-store-'));
    const dbPath = path.join(tmpDir, 'state.db');
    const store = new SqliteServiceStateStore(dbPath);

    const coreA = new ControlApiCore(
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

    const coreB = new ControlApiCore(
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
