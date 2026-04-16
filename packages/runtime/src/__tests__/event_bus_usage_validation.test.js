"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("@system/events");
describe('EventBus usage event validation', () => {
    it('accepts valid usage event payload', () => {
        expect(() => (0, events_1.validateCanonicalEventInput)({
            type: 'usage.token_usage',
            runId: 'run_1',
            projectId: 'project_1',
            chainId: 'chain_1',
            payload: {
                tenantId: 'tenant_1',
                workspaceId: 'workspace_1',
                userId: 'user_1',
                quantity: 10,
            },
        })).not.toThrow();
    });
    it('rejects usage event payload missing tenant', () => {
        expect(() => (0, events_1.validateCanonicalEventInput)({
            type: 'usage.token_usage',
            runId: 'run_1',
            projectId: 'project_1',
            chainId: 'chain_1',
            payload: {
                workspaceId: 'workspace_1',
                userId: 'user_1',
                quantity: 10,
            },
        })).toThrow(/usage_payload_missing_tenant_id/);
    });
});
