"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('AntiAbuseGuard', () => {
    it('allows normal traffic', () => {
        const result = (0, billing_1.evaluateAntiAbuse)({
            tenantId: 'tenant_1',
            actorId: 'user_1',
            actionKey: 'billing:create_subscription',
            nowMs: 1_000,
        });
        expect(result.allowed).toBe(true);
    });
    it('blocks tenant isolation violations', () => {
        const result = (0, billing_1.validateTenantIsolation)({ tenantId: 'tenant_1', resourceTenantId: 'tenant_2' });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('tenant_isolation_violation');
    });
});
