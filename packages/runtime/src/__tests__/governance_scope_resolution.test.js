"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const governance_1 = require("@system/governance");
(0, globals_1.describe)('Governance Scope Resolution', () => {
    const mockContext = {
        runId: 'run-1',
        projectId: 'project-A',
        ticketId: 'AGSYS-123',
        chainId: 'chain-1',
    };
    const globalRule = {
        id: 'rule-1',
        triggerPhases: ['BEFORE_RUN'],
        evidence: ['file1'],
        evaluationType: 'deterministic',
        enforcementMode: 'hard',
        enabledByDefault: true,
        is_enabled: true,
        scope: { level: 'global' },
        metadata: {
            name: 'Global Rule',
            description: 'G',
            version: '1',
            owner: 'sys',
            tags: [],
            createdAt: '',
            updatedAt: '',
        },
        thresholds: { count: 10 },
    };
    (0, globals_1.test)('should include global rules by default', () => {
        const rules = [globalRule];
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: mockContext,
        });
        (0, globals_1.expect)(resolved).toHaveLength(1);
        (0, globals_1.expect)(resolved[0].id).toBe('rule-1');
    });
    (0, globals_1.test)('should apply project overrides to global rules', () => {
        const rules = [globalRule];
        const projectOverrides = {
            'rule-1': {
                thresholds: { count: 20 },
            },
        };
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: mockContext,
            projectOverrides,
        });
        (0, globals_1.expect)(resolved[0].thresholds?.count).toBe(20);
    });
    (0, globals_1.test)('should prioritize session rules over global rules', () => {
        const sessionRule = {
            ...globalRule,
            id: 'rule-1',
            scope: { level: 'session', sessionId: 'chain-1' },
            thresholds: { count: 30 },
        };
        const rules = [globalRule, sessionRule];
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: mockContext,
        });
        (0, globals_1.expect)(resolved).toHaveLength(1);
        (0, globals_1.expect)(resolved[0].scope?.level).toBe('session');
        (0, globals_1.expect)(resolved[0].thresholds?.count).toBe(30);
    });
    (0, globals_1.test)('should filter out rules from other projects', () => {
        const otherProjectRule = {
            ...globalRule,
            id: 'rule-other',
            scope: { level: 'project', projectId: 'project-B' },
        };
        const rules = [globalRule, otherProjectRule];
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: mockContext,
        });
        (0, globals_1.expect)(resolved).toHaveLength(1);
        (0, globals_1.expect)(resolved[0].id).toBe('rule-1');
    });
    (0, globals_1.test)('should include rules for the current project', () => {
        const projectRule = {
            ...globalRule,
            id: 'rule-project',
            scope: { level: 'project', projectId: 'project-A' },
        };
        const rules = [globalRule, projectRule];
        const resolved = (0, governance_1.resolveScopedRules)({
            rules,
            context: mockContext,
        });
        (0, globals_1.expect)(resolved).toHaveLength(2);
    });
});
