"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
describe('PlanDefinitions', () => {
    it('provides Free/Pro/Team/Enterprise plan set', () => {
        const bundle = (0, billing_1.buildDefaultPlanBundle)(2);
        const validation = (0, billing_1.validateRequiredPlanSet)(bundle.plans);
        expect(validation.ok).toBe(true);
        expect(bundle.plans.every((p) => p.version === 2)).toBe(true);
    });
    it('fails when required plan is missing', () => {
        const bundle = (0, billing_1.buildDefaultPlanBundle)(1);
        const filtered = bundle.plans.filter((p) => p.name !== 'team');
        const validation = (0, billing_1.validateRequiredPlanSet)(filtered);
        expect(validation.ok).toBe(false);
    });
});
