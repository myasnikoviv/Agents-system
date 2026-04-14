import type { ServiceRuntimeState } from './ControlPlaneCore';

export type FailureKind = 'crash' | 'degraded' | 'timeout' | 'none';

export interface FailureClassification {
  serviceId: string;
  kind: FailureKind;
  reason: string | null;
  telemetry: {
    serviceId: string;
    kind: FailureKind;
    reason: string | null;
    timestamp: string;
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function classifyFailure(runtime: ServiceRuntimeState): FailureClassification {
  const reason = runtime.errorReason || null;
  const normalized = String(reason || '').toLowerCase();

  let kind: FailureKind = 'none';
  if (runtime.status === 'degraded') kind = 'degraded';
  if (runtime.status === 'failed') kind = 'crash';
  if (normalized.includes('timeout') || normalized.includes('timed out')) kind = 'timeout';

  const classification = {
    serviceId: runtime.serviceId,
    kind,
    reason,
    telemetry: {
      serviceId: runtime.serviceId,
      kind,
      reason,
      timestamp: nowIso(),
    },
  };

  // AGSYS-3522: Emit Telemetry Signal for failures
  if (kind !== 'none') {
    try {
      const { signalCollector } = require('../adaptive/SignalCollector');
      signalCollector.emit({
        type: 'failure',
        assetId: runtime.serviceId,
        projectId: 'system',
        value: kind,
        metadata: { reason }
      });
    } catch (e) {
      // Non-blocking telemetry failure
    }
  }

  return classification;
}

export class FailureTelemetryBuffer {
  private readonly events: FailureClassification['telemetry'][] = [];

  push(event: FailureClassification['telemetry']): void {
    this.events.push({ ...event });
  }

  list(): FailureClassification['telemetry'][] {
    return this.events.map((event) => ({ ...event }));
  }
}
