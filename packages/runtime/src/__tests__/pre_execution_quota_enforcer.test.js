"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('PreExecutionQuotaEnforcer', () => {
    it('allows when quota context is absent', () => {
        const result = (0, billing_1.evaluatePreExecutionQuota)({});
        expect(result.allowed).toBe(true);
    });
    it('blocks when projected usage exceeds hard limit', () => {
        const result = (0, billing_1.evaluatePreExecutionQuota)({
            quota: {
                quotaId: 'q1',
                tenantId: 't1',
                type: 'tokens',
                period: 'month',
                limit: 1000,
            },
            currentUsage: 950,
            requestedUsage: 60,
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('quota_hard_limit_exceeded');
        expect(String(result.message || '')).toContain('Execution blocked by quota policy');
    });
});
