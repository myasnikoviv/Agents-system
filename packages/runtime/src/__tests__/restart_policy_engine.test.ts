import { RestartPolicyEngine } from '../control-api/RestartPolicyEngine';

describe('RestartPolicyEngine (AGSYS-2711)', () => {
  it('allows restart on failure', () => {
    const engine = new RestartPolicyEngine();
    const decision = engine.decide(
      'backend',
      {
        type: 'api',
        runtime: 'node',
        desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 3, backoffMs: 100 } },
      },
      {
        serviceId: 'backend',
        desired: 'running',
        status: 'failed',
        restartCount: 1,
        lastCheckAt: null,
        errorReason: 'crash',
      },
    );

    expect(decision.allowed).toBe(true);
    expect(decision.delayMs).toBe(200);
  });

  it('respects max retries', () => {
    const engine = new RestartPolicyEngine();
    const decision = engine.decide(
      'worker',
      {
        type: 'worker',
        runtime: 'node',
        desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 2, backoffMs: 50 } },
      },
      {
        serviceId: 'worker',
        desired: 'running',
        status: 'failed',
        restartCount: 2,
        lastCheckAt: null,
        errorReason: 'timeout',
      },
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('max_retries');
  });

  it('applies basic exponential backoff', () => {
    const engine = new RestartPolicyEngine();
    const first = engine.decide(
      'dispatcher',
      {
        type: 'worker',
        runtime: 'node',
        desired: { state: 'running', restartPolicy: { mode: 'always', maxRetries: 5, backoffMs: 100 } },
      },
      {
        serviceId: 'dispatcher',
        desired: 'running',
        status: 'failed',
        restartCount: 0,
        lastCheckAt: null,
        errorReason: null,
      },
    );

    const second = engine.decide(
      'dispatcher',
      {
        type: 'worker',
        runtime: 'node',
        desired: { state: 'running', restartPolicy: { mode: 'always', maxRetries: 5, backoffMs: 100 } },
      },
      {
        serviceId: 'dispatcher',
        desired: 'running',
        status: 'failed',
        restartCount: 1,
        lastCheckAt: null,
        errorReason: null,
      },
    );

    expect(first.delayMs).toBe(100);
    expect(second.delayMs).toBe(200);
  });

  it('detects restart loops', () => {
    const engine = new RestartPolicyEngine({ loopWindowMs: 60_000, loopThreshold: 3 });
    const now = Date.now();
    engine.recordRestart('api', now - 1000);
    engine.recordRestart('api', now - 800);
    engine.recordRestart('api', now - 600);

    const decision = engine.decide(
      'api',
      {
        type: 'api',
        runtime: 'node',
        desired: { state: 'running', restartPolicy: { mode: 'always', maxRetries: 10, backoffMs: 100 } },
      },
      {
        serviceId: 'api',
        desired: 'running',
        status: 'failed',
        restartCount: 2,
        lastCheckAt: null,
        errorReason: 'crash',
      },
    );

    expect(decision.allowed).toBe(false);
    expect(decision.loopDetected).toBe(true);
  });
});
