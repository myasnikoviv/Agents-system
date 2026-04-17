"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const governance_1 = require("@system/governance");
const MOCK_METADATA = {
    name: 'Cost Guard',
    description: 'Limits token cost',
    version: '1.0.0',
    owner: 'system',
    tags: ['cost'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};
describe('ScopeResolutionEngine', () => {
    it('prefers session scope over project and global for same rule id', () => {
        const rules = [
            {
                id: 'cost_guard_light',
                triggerPhases: ['AFTER_RUN'],
                evidence: ['telemetry'],
                evaluationType: 'deterministic',
                deterministicCheck: 'cost_guard_tokens',
                enforcementMode: 'advisory',
                enabledByDefault: true,
                is_enabled: true,
                thresholds: { maxTokens: 120000 },
                scope: { level: 'global' },
                metadata: MOCK_METADATA,
            },
            {
                id: 'cost_guard_light',
                triggerPhases: ['AFTER_RUN'],
                evidence: ['telemetry'],
                evaluationType: 'deterministic',
                deterministicCheck: 'cost_guard_tokens',
                enforcementMode: 'advisory',
                enabledByDefault: true,
                is_enabled: true,
                thresholds: { maxTokens: 90000 },
                scope: { level: 'project', projectId: 'proj-a' },
                metadata: MOCK_METADATA,
            },
            {
                id: 'cost_guard_light',
                triggerPhases: ['AFTER_RUN'],
                evidence: ['telemetry'],
                evaluationType: 'deterministic',
                deterministicCheck: 'cost_guard_tokens',
                enforcementMode: 'advisory',
                enabledByDefault: true,
                is_enabled: true,
                thresholds: { maxTokens: 75000 },
                scope: { level: 'session', projectId: 'proj-a', sessionId: 'thread-1' },
                metadata: MOCK_METADATA,
            },
        ];
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: {
                runId: 'run-1',
                projectId: 'proj-a',
                ticketId: 'AGSYS-1',
                chainId: 'thread-1',
            },
        });
        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe('cost_guard_light');
        expect(resolved[0].scope?.level).toBe('session');
        expect(resolved[0].thresholds?.maxTokens).toBe(75000);
    });
});
