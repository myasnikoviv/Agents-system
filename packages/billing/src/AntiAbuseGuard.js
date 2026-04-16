"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAntiAbuse = evaluateAntiAbuse;
exports.validateTenantIsolation = validateTenantIsolation;
const perTenantActionCounters = new Map();
const perTenantActorTotals = new Map();
const WINDOW_MS = 60_000;
const MAX_ACTIONS_PER_WINDOW = 120;
const MAX_ACTIONS_PER_ACTOR_TOTAL = 10_000;
function counterKey(input) {
    return `${input.tenantId}:${input.actionKey}`;
}
function actorKey(input) {
    return `${input.tenantId}:${input.actorId}`;
}
function evaluateAntiAbuse(input) {
    const now = Number(input.nowMs || Date.now());
    const key = counterKey(input);
    const actor = actorKey(input);
    const current = perTenantActionCounters.get(key);
    if (!current || now - current.windowStartMs > WINDOW_MS) {
        perTenantActionCounters.set(key, { windowStartMs: now, count: 1 });
    }
    else {
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
function validateTenantIsolation(input) {
    if (String(input.tenantId || '') !== String(input.resourceTenantId || '')) {
        return { allowed: false, reason: 'tenant_isolation_violation' };
    }
    return { allowed: true, reason: 'tenant_isolation_ok' };
}
