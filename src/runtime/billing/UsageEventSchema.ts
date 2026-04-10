export type BillingUsageEventType =
  | 'usage.token_usage'
  | 'usage.tool_execution'
  | 'usage.runtime_time'
  | 'usage.storage_usage'
  | 'usage.mcp_usage';

export interface BillingUsageEventPayload {
  tenantId: string;
  workspaceId: string;
  userId: string;
  quantity: number;
  unit?: string;
  meta?: Record<string, any>;
}

export function isBillingUsageEventType(type: string): type is BillingUsageEventType {
  return (
    type === 'usage.token_usage' ||
    type === 'usage.tool_execution' ||
    type === 'usage.runtime_time' ||
    type === 'usage.storage_usage' ||
    type === 'usage.mcp_usage'
  );
}

export function validateBillingUsagePayload(payload: Record<string, any>): { ok: true } | { ok: false; reason: string } {
  const tenantId = String(payload?.tenantId || '').trim();
  const workspaceId = String(payload?.workspaceId || '').trim();
  const userId = String(payload?.userId || '').trim();
  const quantity = Number(payload?.quantity);

  if (!tenantId) return { ok: false, reason: 'usage_payload_missing_tenant_id' };
  if (!workspaceId) return { ok: false, reason: 'usage_payload_missing_workspace_id' };
  if (!userId) return { ok: false, reason: 'usage_payload_missing_user_id' };
  if (!Number.isFinite(quantity) || quantity < 0) return { ok: false, reason: 'usage_payload_invalid_quantity' };

  return { ok: true };
}

