import { resolveScopedRules } from '../governance/ScopeResolutionEngine';
import type { GovernanceRule } from '../governance/GovernanceEngineTypes';

describe('ScopeResolutionEngine', () => {
  it('prefers session scope over project and global for same rule id', () => {
    const rules: GovernanceRule[] = [
      {
        id: 'cost_guard_light',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['telemetry'],
        evaluationType: 'deterministic',
        deterministicCheck: 'cost_guard_tokens',
        enforcementMode: 'advisory',
        enabledByDefault: true,
        thresholds: { maxTokens: 120000 },
        scope: { level: 'global' },
      },
      {
        id: 'cost_guard_light',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['telemetry'],
        evaluationType: 'deterministic',
        deterministicCheck: 'cost_guard_tokens',
        enforcementMode: 'advisory',
        enabledByDefault: true,
        thresholds: { maxTokens: 90000 },
        scope: { level: 'project', projectId: 'proj-a' },
      },
      {
        id: 'cost_guard_light',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['telemetry'],
        evaluationType: 'deterministic',
        deterministicCheck: 'cost_guard_tokens',
        enforcementMode: 'advisory',
        enabledByDefault: true,
        thresholds: { maxTokens: 75000 },
        scope: { level: 'session', projectId: 'proj-a', sessionId: 'thread-1' },
      },
    ];

    const resolved = resolveScopedRules({
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
