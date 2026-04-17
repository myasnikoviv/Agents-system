import { decideWorkerScaling } from '../workers/WorkerScalingStrategy';

describe('WorkerScalingStrategy', () => {
  afterEach(() => {
    delete process.env.RUNTIME_SCALE_MIN_WORKERS;
    delete process.env.RUNTIME_SCALE_MAX_WORKERS;
    delete process.env.RUNTIME_SCALE_TARGET_TASKS_PER_WORKER;
    delete process.env.RUNTIME_SCALE_DOWN_QUEUE_THRESHOLD;
    delete process.env.RUNTIME_SCALE_COOLDOWN_MS;
  });

  it('scales up when queue pressure exceeds current capacity', () => {
    process.env.RUNTIME_SCALE_MIN_WORKERS = '0';
    process.env.RUNTIME_SCALE_MAX_WORKERS = '5';
    process.env.RUNTIME_SCALE_TARGET_TASKS_PER_WORKER = '2';
    const decision = decideWorkerScaling({
      queueDepth: 7,
      currentWorkers: 1,
      activeWorkers: 1,
      now: 100_000,
      lastScaledAt: 0,
    });
    expect(decision.action).toBe('scale_up');
    expect(decision.desiredWorkers).toBe(4);
  });

  it('scales down to minimum when queue is empty', () => {
    process.env.RUNTIME_SCALE_MIN_WORKERS = '1';
    process.env.RUNTIME_SCALE_MAX_WORKERS = '5';
    process.env.RUNTIME_SCALE_DOWN_QUEUE_THRESHOLD = '0';
    const decision = decideWorkerScaling({
      queueDepth: 0,
      currentWorkers: 4,
      activeWorkers: 0,
      now: 100_000,
      lastScaledAt: 0,
    });
    expect(decision.action).toBe('scale_down');
    expect(decision.desiredWorkers).toBe(1);
  });

  it('holds during cooldown to prevent thrashing', () => {
    process.env.RUNTIME_SCALE_MIN_WORKERS = '0';
    process.env.RUNTIME_SCALE_MAX_WORKERS = '5';
    process.env.RUNTIME_SCALE_COOLDOWN_MS = '10000';
    const decision = decideWorkerScaling({
      queueDepth: 10,
      currentWorkers: 1,
      activeWorkers: 1,
      now: 25_000,
      lastScaledAt: 20_000,
    });
    expect(decision.action).toBe('hold');
    expect(decision.reason).toBe('cooldown_active');
    expect(decision.cooldownMsRemaining).toBeGreaterThan(0);
  });
});

