"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('UsageEventSchema', () => {
    it('accepts payload with tenant/workspace/user and non-negative quantity', () => {
        const result = (0, billing_1.validateBillingUsagePayload)({
            tenantId: 'tenant_1',
            workspaceId: 'workspace_1',
            userId: 'user_1',
            quantity: 42,
            unit: 'tokens',
        });
        expect(result.ok).toBe(true);
    });
    it('rejects payload without tenant/workspace/user', () => {
        const result = (0, billing_1.validateBillingUsagePayload)({
            tenantId: '',
            workspaceId: 'workspace_1',
            userId: 'user_1',
            quantity: 42,
        });
        expect(result.ok).toBe(false);
    });
});
