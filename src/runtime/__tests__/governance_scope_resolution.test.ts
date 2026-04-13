import { describe, test, expect } from '@jest/globals';
import { resolveScopedRules } from '../governance/ScopeResolutionEngine';
import { GovernanceRule, GovernanceEngineContext } from '../governance/GovernanceEngineTypes';

describe('Governance Scope Resolution', () => {
  const mockContext: GovernanceEngineContext = {
    runId: 'run-1',
    projectId: 'project-A',
    ticketId: 'AGSYS-123',
    chainId: 'chain-1',
  };

  const globalRule: GovernanceRule = {
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

  test('should include global rules by default', () => {
    const rules = [globalRule];
    const resolved = resolveScopedRules({
      rules,
      context: mockContext,
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('rule-1');
  });

  test('should apply project overrides to global rules', () => {
    const rules = [globalRule];
    const projectOverrides = {
      'rule-1': {
        thresholds: { count: 20 },
      },
    };
    const resolved = resolveScopedRules({
      rules,
      context: mockContext,
      projectOverrides,
    });
    expect(resolved[0].thresholds?.count).toBe(20);
  });

  test('should prioritize session rules over global rules', () => {
    const sessionRule: GovernanceRule = {
      ...globalRule,
      id: 'rule-1',
      scope: { level: 'session', sessionId: 'chain-1' },
      thresholds: { count: 30 },
    };
    const rules = [globalRule, sessionRule];
    const resolved = resolveScopedRules({
      rules,
      context: mockContext,
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].scope?.level).toBe('session');
    expect(resolved[0].thresholds?.count).toBe(30);
  });

  test('should filter out rules from other projects', () => {
    const otherProjectRule: GovernanceRule = {
      ...globalRule,
      id: 'rule-other',
      scope: { level: 'project', projectId: 'project-B' },
    };
    const rules = [globalRule, otherProjectRule];
    const resolved = resolveScopedRules({
      rules,
      context: mockContext,
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('rule-1');
  });

  test('should include rules for the current project', () => {
    const projectRule: GovernanceRule = {
      ...globalRule,
      id: 'rule-project',
      scope: { level: 'project', projectId: 'project-A' },
    };
    const rules = [globalRule, projectRule];
    const resolved = resolveScopedRules({
      rules,
      context: mockContext,
    });
    expect(resolved).toHaveLength(2);
  });
});
