"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('BillingDomainModel', () => {
    it('accepts valid billing domain snapshot', () => {
        const snapshot = {
            plans: [
                {
                    planId: 'plan_pro_v1',
                    name: 'pro',
                    priceMonthlyUsdCents: 2900,
                    quotaIds: ['q_tokens', 'q_runtime'],
                    entitlementId: 'ent_pro',
                    version: 1,
                    active: true,
                },
            ],
            subscriptions: [
                {
                    subscriptionId: 'sub_1',
                    tenantId: 'tenant_1',
                    planId: 'plan_pro_v1',
                    status: 'active',
                    billingPeriod: 'month',
                },
            ],
            usageRecords: [
                {
                    usageId: 'u_1',
                    tenantId: 'tenant_1',
                    workspaceId: 'ws_1',
                    userId: 'user_1',
                    type: 'token_usage',
                    quantity: 1200,
                    timestampMs: Date.now(),
                },
            ],
            quotas: [
                {
                    quotaId: 'q_tokens',
                    tenantId: 'tenant_1',
                    type: 'tokens',
                    period: 'month',
                    limit: 1_000_000,
                    softLimit: 900_000,
                },
                {
                    quotaId: 'q_runtime',
                    tenantId: 'tenant_1',
                    type: 'runtime_time',
                    period: 'month',
                    limit: 10_000,
                },
            ],
            entitlements: [
                {
                    entitlementId: 'ent_pro',
                    tenantId: 'tenant_1',
                    allowedModels: ['google/gemini-2.5-flash'],
                    maxAgents: 8,
                    features: ['governance_center', 'multiple_agents'],
                },
            ],
        };
        expect((0, billing_1.validateBillingDomainSnapshot)(snapshot).ok).toBe(true);
    });
    it('rejects missing entitlement linkage', () => {
        const snapshot = {
            plans: [
                {
                    planId: 'plan_free_v1',
                    name: 'free',
                    priceMonthlyUsdCents: 0,
                    quotaIds: [],
                    entitlementId: 'ent_missing',
                    version: 1,
                    active: true,
                },
            ],
            subscriptions: [],
            usageRecords: [],
            quotas: [],
            entitlements: [],
        };
        const result = (0, billing_1.validateBillingDomainSnapshot)(snapshot);
        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.reason).toBe('plan_without_entitlement:plan_free_v1');
        }
    });
    it('rejects usage for unknown tenant', () => {
        const snapshot = {
            plans: [],
            subscriptions: [],
            usageRecords: [
                {
                    usageId: 'u_2',
                    tenantId: 'tenant_missing',
                    workspaceId: 'ws_1',
                    userId: 'user_1',
                    type: 'mcp_usage',
                    quantity: 1,
                    timestampMs: Date.now(),
                },
            ],
            quotas: [],
            entitlements: [],
        };
        const result = (0, billing_1.validateBillingDomainSnapshot)(snapshot);
        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.reason).toBe('usage_unknown_tenant:u_2');
        }
    });
});
