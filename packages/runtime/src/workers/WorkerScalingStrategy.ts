export interface WorkerScalingStrategyInput {
  queueDepth: number;
  currentWorkers: number;
  activeWorkers: number;
  now?: number;
  lastScaledAt?: number;
}

export interface WorkerScalingStrategyDecision {
  action: 'scale_up' | 'scale_down' | 'hold';
  desiredWorkers: number;
  reason: string;
  queueDepth: number;
  currentWorkers: number;
  activeWorkers: number;
  cooldownMsRemaining: number;
}

function envNum(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return raw;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function decideWorkerScaling(input: WorkerScalingStrategyInput): WorkerScalingStrategyDecision {
  const queueDepth = Math.max(0, Math.floor(Number(input.queueDepth || 0)));
  const currentWorkers = Math.max(0, Math.floor(Number(input.currentWorkers || 0)));
  const activeWorkers = Math.max(0, Math.floor(Number(input.activeWorkers || 0)));
  const now = Math.max(0, Number(input.now || Date.now()));
  const lastScaledAt = Math.max(0, Number(input.lastScaledAt || 0));

  const minWorkers = Math.max(0, Math.floor(envNum('RUNTIME_SCALE_MIN_WORKERS', 0)));
  const maxWorkers = Math.max(minWorkers, Math.floor(envNum('RUNTIME_SCALE_MAX_WORKERS', 6)));
  const tasksPerWorker = Math.max(1, Math.floor(envNum('RUNTIME_SCALE_TARGET_TASKS_PER_WORKER', 1)));
  const scaleDownQueueThreshold = Math.max(0, Math.floor(envNum('RUNTIME_SCALE_DOWN_QUEUE_THRESHOLD', 0)));
  const cooldownMs = Math.max(0, Math.floor(envNum('RUNTIME_SCALE_COOLDOWN_MS', 15000)));

  const queueTarget = clamp(Math.ceil(queueDepth / tasksPerWorker), minWorkers, maxWorkers);
  const busyFloor = clamp(activeWorkers, minWorkers, maxWorkers);
  const desiredByLoad = Math.max(queueTarget, busyFloor);

  const desiredWorkers = queueDepth <= scaleDownQueueThreshold
    ? minWorkers
    : clamp(desiredByLoad, minWorkers, maxWorkers);

  const elapsed = now - lastScaledAt;
  const cooldownMsRemaining = elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
  if (cooldownMsRemaining > 0) {
    return {
      action: 'hold',
      desiredWorkers: currentWorkers,
      reason: 'cooldown_active',
      queueDepth,
      currentWorkers,
      activeWorkers,
      cooldownMsRemaining,
    };
  }

  if (desiredWorkers > currentWorkers) {
    return {
      action: 'scale_up',
      desiredWorkers,
      reason: 'queue_depth_pressure',
      queueDepth,
      currentWorkers,
      activeWorkers,
      cooldownMsRemaining: 0,
    };
  }
  if (desiredWorkers < currentWorkers) {
    return {
      action: 'scale_down',
      desiredWorkers,
      reason: 'idle_capacity',
      queueDepth,
      currentWorkers,
      activeWorkers,
      cooldownMsRemaining: 0,
    };
  }
  return {
    action: 'hold',
    desiredWorkers,
    reason: 'capacity_balanced',
    queueDepth,
    currentWorkers,
    activeWorkers,
    cooldownMsRemaining: 0,
  };
}

