import fs from 'fs';
import path from 'path';

export type ServiceLifecycleEventKind =
  | 'service.started'
  | 'service.failed'
  | 'service.restarted'
  | 'service.degraded'
  | 'service.stopped';

export interface ServiceLifecycleEvent {
  kind: ServiceLifecycleEventKind;
  serviceId: string;
  reason: string | null;
  timestamp: string;
  source: string;
  actorId: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class ServiceLifecycleEventBus {
  private readonly events: ServiceLifecycleEvent[] = [];
  private readonly storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = path.resolve(storagePath || path.join(process.cwd(), '.agent-system', 'control-api-events.jsonl'));
    this.restore();
  }

  emit(
    kind: ServiceLifecycleEventKind,
    serviceId: string,
    reason?: string | null,
    metadata?: { source?: string; actorId?: string | null },
  ): ServiceLifecycleEvent {
    const event: ServiceLifecycleEvent = {
      kind,
      serviceId,
      reason: reason ?? null,
      timestamp: nowIso(),
      source: metadata?.source || 'system',
      actorId: metadata?.actorId ?? null,
    };
    this.events.push(event);
    this.persist(event);
    return event;
  }

  list(): ServiceLifecycleEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  private persist(event: ServiceLifecycleEvent): void {
    fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
    fs.appendFileSync(this.storagePath, `${JSON.stringify(event)}\n`, 'utf-8');
  }

  private restore(): void {
    try {
      if (!fs.existsSync(this.storagePath)) return;
      const raw = fs.readFileSync(this.storagePath, 'utf-8');
      const lines = raw.split('\n').map((x) => x.trim()).filter(Boolean);
      for (const line of lines) {
        const parsed = JSON.parse(line) as ServiceLifecycleEvent;
        if (parsed?.kind && parsed?.serviceId && parsed?.timestamp) this.events.push(parsed);
      }
    } catch {
      // best-effort restore; runtime should not fail on telemetry corruption
    }
  }
}
