import type { RuntimeEvent } from '../events/types';
import { isBillingUsageEventType, validateBillingUsagePayload } from './UsageEventSchema';

export interface MeteredUsageEvent {
  eventId: string;
  runId: string;
  projectId: string;
  chainId: string;
  type: RuntimeEvent['type'];
  tenantId: string;
  workspaceId: string;
  userId: string;
  quantity: number;
  unit?: string;
  timestamp: number;
}

export class UsageMeteringPipeline {
  private readonly seenEventIds = new Set<string>();
  private readonly records: MeteredUsageEvent[] = [];

  process(event: RuntimeEvent): { accepted: boolean; reason?: string } {
    if (!isBillingUsageEventType(event.type)) {
      return { accepted: false, reason: 'not_usage_event' };
    }

    if (this.seenEventIds.has(event.id)) {
      return { accepted: false, reason: 'duplicate_event' };
    }

    const validation = validateBillingUsagePayload(event.payload);
    if (!validation.ok) {
      return { accepted: false, reason: validation.reason };
    }

    this.seenEventIds.add(event.id);
    this.records.push({
      eventId: event.id,
      runId: event.runId,
      projectId: event.projectId,
      chainId: event.chainId,
      type: event.type,
      tenantId: String(event.payload.tenantId),
      workspaceId: String(event.payload.workspaceId),
      userId: String(event.payload.userId),
      quantity: Number(event.payload.quantity),
      unit: event.payload.unit ? String(event.payload.unit) : undefined,
      timestamp: event.timestamp,
    });

    return { accepted: true };
  }

  getRecords(): MeteredUsageEvent[] {
    return [...this.records];
  }
}

export const usageMeteringPipeline = new UsageMeteringPipeline();

