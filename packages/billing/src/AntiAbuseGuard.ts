export interface AbuseCheckInput {
  tenantId: string;
  actorId: string;
  nowMs?: number;
  actionKey: string;
}

export interface AbuseCheckResult {
  allowed: boolean;
  reason: string;
}

interface WindowCounter {
  windowStartMs: number;
  count: number;
}

const perTenantActionCounters = new Map<string, WindowCounter>();
const perTenantActorTotals = new Map<string, number>();

const WINDOW_MS = 60_000;
const MAX_ACTIONS_PER_WINDOW = 120;
const MAX_ACTIONS_PER_ACTOR_TOTAL = 10_000;

function counterKey(input: AbuseCheckInput): string {
  return `${input.tenantId}:${input.actionKey}`;
}

function actorKey(input: AbuseCheckInput): string {
  return `${input.tenantId}:${input.actorId}`;
}

export function evaluateAntiAbuse(input: AbuseCheckInput): AbuseCheckResult {
  const now = Number(input.nowMs || Date.now());
  const key = counterKey(input);
  const actor = actorKey(input);

  const current = perTenantActionCounters.get(key);
  if (!current || now - current.windowStartMs > WINDOW_MS) {
    perTenantActionCounters.set(key, { windowStartMs: now, count: 1 });
  } else {
    current.count += 1;
    perTenantActionCounters.set(key, current);
    if (current.count > MAX_ACTIONS_PER_WINDOW) {
      return { allowed: false, reason: `rate_limit_exceeded:${input.actionKey}` };
    }
  }

  const total = (perTenantActorTotals.get(actor) || 0) + 1;
  perTenantActorTotals.set(actor, total);
  if (total > MAX_ACTIONS_PER_ACTOR_TOTAL) {
    return { allowed: false, reason: 'anomaly_detected_actor_volume' };
  }

  return { allowed: true, reason: 'abuse_check_pass' };
}

export function validateTenantIsolation(input: { tenantId: string; resourceTenantId: string }): AbuseCheckResult {
  if (String(input.tenantId || '') !== String(input.resourceTenantId || '')) {
    return { allowed: false, reason: 'tenant_isolation_violation' };
  }
  return { allowed: true, reason: 'tenant_isolation_ok' };
}

