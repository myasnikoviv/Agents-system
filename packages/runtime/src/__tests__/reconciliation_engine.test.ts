import { ControlApiCore } from '../control-api/ControlApiCore';
import { ReconciliationEngine } from '../control-api/ReconciliationEngine';

describe('ReconciliationEngine (AGSYS-2705)', () => {
  it('detects mismatch and triggers start action', async () => {
    const core = new ControlApiCore({
      schemaVersion: 'service-registry.v1',
      services: {
        backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
      },
    });

    const actions: string[] = [];
    const engine = new ReconciliationEngine(core, {
      intervalMs: 100,
      observe: async (serviceId) => ({ serviceId, status: 'stopped', checkedAt: new Date().toISOString() }),
      execute: async (action) => {
        actions.push(`${action.serviceId}:${action.type}`);
      },
    });

    const tick = await engine.runOnce();
    expect(tick.actions.length).toBe(1);
    expect(actions).toContain('backend:start');
  });

  it('restarts degraded service for running desired state', async () => {
    const core = new ControlApiCore({
      schemaVersion: 'service-registry.v1',
      services: {
        dispatcher: { type: 'worker', runtime: 'node', desired: { state: 'running' } },
      },
    });

    const actions: string[] = [];
    const engine = new ReconciliationEngine(core, {
      observe: async (serviceId) => ({ serviceId, status: 'degraded', checkedAt: new Date().toISOString(), reason: 'timeout' }),
      execute: async (action) => {
        actions.push(action.type);
      },
    });

    await engine.runOnce();
    expect(actions).toContain('restart');
    expect(core.getState('dispatcher').restartCount).toBe(1);
  });

  it('stops service when desired is stopped but observed is healthy', async () => {
    const core = new ControlApiCore({
      schemaVersion: 'service-registry.v1',
      services: {
        redis: { type: 'infra', runtime: 'docker', desired: { state: 'stopped' } },
      },
    });

    const actions: string[] = [];
    const engine = new ReconciliationEngine(core, {
      observe: async (serviceId) => ({ serviceId, status: 'healthy', checkedAt: new Date().toISOString() }),
      execute: async (action) => {
        actions.push(action.type);
      },
    });

    await engine.runOnce();
    expect(actions).toContain('stop');
  });

  it('runs as periodic loop and can stop cleanly', async () => {
    const core = new ControlApiCore({
      schemaVersion: 'service-registry.v1',
      services: {
        backend: { type: 'api', runtime: 'node', desired: { state: 'running' } },
      },
    });

    let executes = 0;
    const engine = new ReconciliationEngine(core, {
      intervalMs: 50,
      observe: async (serviceId) => ({ serviceId, status: 'stopped', checkedAt: new Date().toISOString() }),
      execute: async () => {
        executes += 1;
      },
    });

    engine.start();
    await new Promise((resolve) => setTimeout(resolve, 180));
    engine.stop();

    expect(engine.isRunning()).toBe(false);
    expect(executes).toBeGreaterThanOrEqual(1);
  });
});
