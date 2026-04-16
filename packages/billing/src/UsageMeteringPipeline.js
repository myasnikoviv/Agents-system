"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageMeteringPipeline = exports.UsageMeteringPipeline = void 0;
const UsageEventSchema_1 = require("./UsageEventSchema");
class UsageMeteringPipeline {
    seenEventIds = new Set();
    records = [];
    process(event) {
        if (!(0, UsageEventSchema_1.isBillingUsageEventType)(event.type)) {
            return { accepted: false, reason: 'not_usage_event' };
        }
        if (this.seenEventIds.has(event.id)) {
            return { accepted: false, reason: 'duplicate_event' };
        }
        const validation = (0, UsageEventSchema_1.validateBillingUsagePayload)(event.payload);
        if (validation.ok === false) {
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
    getRecords() {
        return [...this.records];
    }
}
exports.UsageMeteringPipeline = UsageMeteringPipeline;
exports.usageMeteringPipeline = new UsageMeteringPipeline();
