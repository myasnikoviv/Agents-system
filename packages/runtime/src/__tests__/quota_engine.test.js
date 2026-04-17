"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('QuotaEngine', () => {
    const engine = new billing_1.QuotaEngine();
    it('allows request under soft/hard limits', () => {
        const result = engine.evaluate({
            quota: {
                quotaId: 'q1',
                tenantId: 't1',
                type: 'tokens',
                period: 'month',
                limit: 1000,
                softLimit: 800,
            },
            currentUsage: 500,
            requestedUsage: 100,
        });
        expect(result.decision).toBe('allow');
    });
    it('warns when soft limit exceeded but hard limit not exceeded', () => {
        const result = engine.evaluate({
            quota: {
                quotaId: 'q1',
                tenantId: 't1',
                type: 'tokens',
                period: 'month',
                limit: 1000,
                softLimit: 700,
            },
            currentUsage: 650,
            requestedUsage: 100,
        });
        expect(result.decision).toBe('warn');
        expect(result.reason).toBe('quota_soft_limit_exceeded');
    });
    it('blocks when hard limit exceeded', () => {
        const result = engine.evaluate({
            quota: {
                quotaId: 'q1',
                tenantId: 't1',
                type: 'tokens',
                period: 'month',
                limit: 1000,
            },
            currentUsage: 950,
            requestedUsage: 100,
        });
        expect(result.decision).toBe('block');
        expect(result.reason).toBe('quota_hard_limit_exceeded');
    });
    it('supports optional burst allowance', () => {
        const result = engine.evaluate({
            quota: {
                quotaId: 'q1',
                tenantId: 't1',
                type: 'tokens',
                period: 'month',
                limit: 1000,
            },
            currentUsage: 980,
            requestedUsage: 30,
            burstAllowance: 20,
        });
        expect(result.decision).toBe('allow');
    });
});
