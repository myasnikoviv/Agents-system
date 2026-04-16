import type { ServiceDescriptor } from './ServiceRegistryContract';
import type { ServiceRuntimeState } from './ControlApiCore';
import type { FailureKind } from './FailureClassifier';

export interface RestartDecision {
  serviceId: string;
  allowed: boolean;
  reason: string;
  delayMs: number;
  loopDetected: boolean;
}

export interface RestartPolicyEngineOptions {
  loopWindowMs?: number;
  loopThreshold?: number;
}

function nowMs(): number {
  return Date.now();
}

export class RestartPolicyEngine {
  private readonly restartHistory = new Map<string, number[]>();
  private readonly loopWindowMs: number;
  private readonly loopThreshold: number;

  constructor(options?: RestartPolicyEngineOptions) {
    this.loopWindowMs = Math.max(1000, Number(options?.loopWindowMs || 60_000));
    this.loopThreshold = Math.max(2, Number(options?.loopThreshold || 5));
  }

  decide(
    serviceId: string,
    descriptor: ServiceDescriptor,
    runtime: ServiceRuntimeState,
    failureKind?: FailureKind,
  ): RestartDecision {
    const policy = descriptor.desired.restartPolicy || {};
    const mode = policy.mode || 'on-failure';
    const maxRetries = Number(policy.maxRetries ?? 3);
    const baseBackoffMs = Math.max(0, Number(policy.backoffMs ?? 500));

    if (mode === 'never') {
      return {
        serviceId,
        allowed: false,
        reason: 'restart_policy_never',
        delayMs: 0,
        loopDetected: false,
      };
    }

    const effectiveFailure = failureKind || (runtime.status === 'failed' ? 'crash' : runtime.status === 'degraded' ? 'degraded' : 'none');
    const failed = effectiveFailure === 'crash' || effectiveFailure === 'degraded' || effectiveFailure === 'timeout';
    if (!failed && mode !== 'always') {
      return {
        serviceId,
        allowed: false,
        reason: `restart_not_required_for_failure_kind:${effectiveFailure}`,
        delayMs: 0,
        loopDetected: false,
      };
    }

    if (runtime.restartCount >= maxRetries) {
      return {
        serviceId,
        allowed: false,
        reason: `restart_max_retries_reached:${runtime.restartCount}/${maxRetries}`,
        delayMs: 0,
        loopDetected: false,
      };
    }

    const history = this.pruneHistory(serviceId);
    const loopDetected = history.length >= this.loopThreshold;
    if (loopDetected) {
      return {
        serviceId,
        allowed: false,
        reason: `restart_loop_detected:${history.length}_within_${this.loopWindowMs}ms`,
        delayMs: 0,
        loopDetected: true,
      };
    }

    const delayMs = baseBackoffMs * Math.max(1, Math.pow(2, runtime.restartCount));
    return {
      serviceId,
      allowed: true,
      reason: `restart_allowed_mode_${mode}`,
      delayMs,
      loopDetected: false,
    };
  }

  recordRestart(serviceId: string, atMs?: number): void {
    const timestamp = Number(atMs || nowMs());
    const next = [...(this.restartHistory.get(serviceId) || []), timestamp].sort((a, b) => a - b);
    this.restartHistory.set(serviceId, next);
    this.pruneHistory(serviceId);
  }

  private pruneHistory(serviceId: string): number[] {
    const cutoff = nowMs() - this.loopWindowMs;
    const kept = (this.restartHistory.get(serviceId) || []).filter((x) => x >= cutoff);
    this.restartHistory.set(serviceId, kept);
    return kept;
  }
}
