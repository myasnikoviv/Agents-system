import { HealthCheckSystem } from '../control-plane/HealthCheckSystem';

describe('HealthCheckSystem (AGSYS-2710)', () => {
  it('supports HTTP health endpoint checks', async () => {
    const system = new HealthCheckSystem({
      httpProbe: async () => ({ statusCode: 200 }),
    });

    const result = await system.evaluate(
      'backend',
      {
        type: 'api',
        runtime: 'node',
        desired: { state: 'running' },
        health: { protocol: 'http', endpoint: 'http://127.0.0.1:3333/health', expectedStatus: 200, timeoutMs: 1000 },
      },
      { serviceId: 'backend', status: 'running' },
    );

    expect(result.status).toBe('healthy');
    expect(result.reason).toBeNull();
  });

  it('supports heartbeat checks and marks degraded when missing', async () => {
    const system = new HealthCheckSystem({
      heartbeatProbe: async () => ({ alive: false }),
    });

    const result = await system.evaluate(
      'worker',
      {
        type: 'worker',
        runtime: 'node',
        desired: { state: 'running' },
        health: { protocol: 'heartbeat', timeoutMs: 300 },
      },
      { serviceId: 'worker', status: 'running' },
    );

    expect(result.status).toBe('degraded');
    expect(result.reason).toContain('heartbeat_missing');
  });

  it('detects degraded state for runtime not running in protocol=none', async () => {
    const system = new HealthCheckSystem();
    const result = await system.evaluate(
      'redis',
      {
        type: 'infra',
        runtime: 'docker',
        desired: { state: 'running' },
        health: { protocol: 'none' },
      },
      { serviceId: 'redis', status: 'stopped' },
    );

    expect(result.status).toBe('degraded');
    expect(result.reason).toContain('runtime_not_running');
  });

  it('runs periodic loop with configurable interval and can stop', async () => {
    const events: string[] = [];
    const system = new HealthCheckSystem(
      {
        processProbe: async () => ({ alive: true }),
      },
      { defaultIntervalMs: 50 },
    );

    system.start({
      listServiceIds: () => ['dispatcher'],
      getDescriptor: () => ({
        type: 'worker',
        runtime: 'node',
        desired: { state: 'running' },
        health: { protocol: 'process', intervalMs: 40 },
      }),
      getRuntime: () => ({ serviceId: 'dispatcher', status: 'running' }),
      onResult: (result) => events.push(result.status),
    });

    await new Promise((resolve) => setTimeout(resolve, 140));
    system.stop();
    expect(system.isRunning()).toBe(false);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});
