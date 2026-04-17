import fs from 'fs';
import path from 'path';
import type { RestartDecision } from './RestartPolicyEngine';

export type IncidentRemediationStatus = 'scheduled' | 'blocked' | 'restarted' | 'restart_failed';

export interface CrashDiagnosticArtifact {
  incidentId: string;
  serviceId: string;
  timestamp: string;
  runtimeStatus: string;
  reason: string | null;
  restartCount: number;
  decision: RestartDecision;
  runtimeSnapshot: Record<string, unknown>;
}

export interface ServiceIncidentRecord {
  incidentId: string;
  serviceId: string;
  timestamp: string;
  runtimeStatus: string;
  reason: string | null;
  restartCount: number;
  remediationStatus: IncidentRemediationStatus;
  remediationReason: string;
  restartDelayMs: number;
  restartScheduledAt: string | null;
  artifactPath: string;
  restartAttemptedAt: string | null;
  restartOutcome: string | null;
}

export interface CrashForensicsStoreOptions {
  timelinePath?: string;
  artifactsDir?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeServiceId(input: string): string {
  return String(input || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown-service';
}

function parseLine<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}

export class CrashForensicsStore {
  private readonly timelinePath: string;
  private readonly artifactsDir: string;
  private readonly incidents = new Map<string, ServiceIncidentRecord>();

  constructor(options?: CrashForensicsStoreOptions) {
    this.timelinePath = path.resolve(
      options?.timelinePath || path.join(process.cwd(), '.agent-system', 'control-api-incidents.jsonl'),
    );
    this.artifactsDir = path.resolve(
      options?.artifactsDir || path.join(process.cwd(), '.agent-system', 'control-api-crash-artifacts'),
    );
    this.restore();
  }

  recordFailure(input: {
    serviceId: string;
    runtimeStatus: string;
    reason: string | null;
    restartCount: number;
    decision: RestartDecision;
    runtimeSnapshot: Record<string, unknown>;
  }): ServiceIncidentRecord {
    const timestamp = nowIso();
    const incidentId = `${normalizeServiceId(input.serviceId)}-${Date.now()}`;
    const artifactPath = this.writeArtifact({
      incidentId,
      serviceId: input.serviceId,
      timestamp,
      runtimeStatus: input.runtimeStatus,
      reason: input.reason,
      restartCount: input.restartCount,
      decision: input.decision,
      runtimeSnapshot: input.runtimeSnapshot,
    });
    const remediationStatus: IncidentRemediationStatus = input.decision.allowed ? 'scheduled' : 'blocked';
    const row: ServiceIncidentRecord = {
      incidentId,
      serviceId: input.serviceId,
      timestamp,
      runtimeStatus: input.runtimeStatus,
      reason: input.reason,
      restartCount: input.restartCount,
      remediationStatus,
      remediationReason: input.decision.reason,
      restartDelayMs: input.decision.delayMs,
      restartScheduledAt: input.decision.allowed ? new Date(Date.now() + input.decision.delayMs).toISOString() : null,
      artifactPath,
      restartAttemptedAt: null,
      restartOutcome: null,
    };
    this.incidents.set(incidentId, row);
    this.persist(row);
    return { ...row };
  }

  markRestartOutcome(incidentId: string, outcome: 'restarted' | 'restart_failed', message?: string | null): void {
    const current = this.incidents.get(incidentId);
    if (!current) return;
    const next: ServiceIncidentRecord = {
      ...current,
      remediationStatus: outcome,
      restartAttemptedAt: nowIso(),
      restartOutcome: message ? String(message) : outcome,
    };
    this.incidents.set(incidentId, next);
    this.persist(next);
  }

  listIncidents(filter?: { serviceId?: string; limit?: number }): ServiceIncidentRecord[] {
    const rows = Array.from(this.incidents.values())
      .filter((x) => !filter?.serviceId || x.serviceId === filter.serviceId)
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    const limit = Math.max(1, Number(filter?.limit || 100));
    return rows.slice(0, limit).map((x) => ({ ...x }));
  }

  getIncident(incidentId: string): ServiceIncidentRecord | null {
    const found = this.incidents.get(incidentId);
    return found ? { ...found } : null;
  }

  private writeArtifact(artifact: CrashDiagnosticArtifact): string {
    fs.mkdirSync(this.artifactsDir, { recursive: true });
    const fileName = `${artifact.incidentId}.json`;
    const filePath = path.join(this.artifactsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2), 'utf-8');
    return filePath;
  }

  private persist(row: ServiceIncidentRecord): void {
    fs.mkdirSync(path.dirname(this.timelinePath), { recursive: true });
    fs.appendFileSync(this.timelinePath, `${JSON.stringify(row)}\n`, 'utf-8');
  }

  private restore(): void {
    try {
      if (!fs.existsSync(this.timelinePath)) return;
      const raw = fs.readFileSync(this.timelinePath, 'utf-8');
      const lines = raw.split('\n').map((x) => x.trim()).filter(Boolean);
      for (const line of lines) {
        const parsed = parseLine<ServiceIncidentRecord>(line);
        if (!parsed?.incidentId || !parsed?.serviceId) continue;
        this.incidents.set(parsed.incidentId, parsed);
      }
    } catch {
      // best-effort restore only
    }
  }
}
