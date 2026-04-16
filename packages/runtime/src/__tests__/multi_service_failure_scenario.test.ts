import { classifyFailure, FailureTelemetryBuffer } from '../control-plane/FailureClassifier';
import { RestartPolicyEngine } from '../control-plane/RestartPolicyEngine';

describe('Multi-service failure scenario (AGSYS-2718)', () => {
  it('detects multiple failures and recovers independently without cascade', () => {
    const telemetry = new FailureTelemetryBuffer();
    const restart = new RestartPolicyEngine({ loopWindowMs: 60_000, loopThreshold: 5 });

    const backendFailure = classifyFailure({
      serviceId: 'backend',
      desired: 'running',
      status: 'failed',
      restartCount: 0,
      lastCheckAt: null,
      errorReason: 'timeout from upstream',
    });
    const workerFailure = classifyFailure({
      serviceId: 'worker',
      desired: 'running',
      status: 'degraded',
      restartCount: 1,
      lastCheckAt: null,
      errorReason: 'heartbeat missing',
    });
    telemetry.push(backendFailure.telemetry);
    telemetry.push(workerFailure.telemetry);

    const backendDecision = restart.decide(
      'backend',
      { type: 'api', runtime: 'node', desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 3, backoffMs: 100 } } },
      { serviceId: 'backend', desired: 'running', status: 'failed', restartCount: 0, lastCheckAt: null, errorReason: 'timeout from upstream' },
      backendFailure.kind,
    );
    const workerDecision = restart.decide(
      'worker',
      { type: 'worker', runtime: 'node', desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 3, backoffMs: 100 } } },
      { serviceId: 'worker', desired: 'running', status: 'degraded', restartCount: 1, lastCheckAt: null, errorReason: 'heartbeat missing' },
      workerFailure.kind,
    );

    expect(backendDecision.allowed).toBe(true);
    expect(workerDecision.allowed).toBe(true);
    expect(backendDecision.reason).toContain('restart_allowed');
    expect(workerDecision.reason).toContain('restart_allowed');
    expect(telemetry.list().length).toBe(2);
    expect(telemetry.list().map((e) => e.serviceId).sort()).toEqual(['backend', 'worker']);
  });
});
