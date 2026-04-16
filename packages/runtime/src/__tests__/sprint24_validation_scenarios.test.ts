import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createGovernanceRule,
  loadGovernanceRules,
} from '@system/governance';
import {
  getProjectPolicy,
  updateProjectPolicy,
  resolveEnabledRules,
} from '@system/governance';
import {
  createGovernanceLoop,
  disableGovernanceLoop,
  isGovernanceLoopRunnable,
} from '@system/governance';

function mkWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 's24-validation-'));
  fs.mkdirSync(path.join(root, 'docs/runtime/governance'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/runtime/governance/rule-registry.yaml'),
    [
      'rules:',
      '  - id: git_preflight',
      '    triggerPhases: [BEFORE_RUN]',
      '    evidence: [docs/process/git/preflights/<ticket>.env]',
      '    evaluationType: deterministic',
      '    deterministicCheck: preflight_token',
      '    enforcementMode: hard',
      '    enabledByDefault: true',
      '',
    ].join('\n'),
    'utf-8',
  );
  return root;
}

describe('Sprint24 validation scenarios', () => {
  it('10.1 marketing project can disable git_preflight via project policy', () => {
    const workspace = mkWorkspace();
    updateProjectPolicy('marketing', { disabledRules: ['git_preflight'] }, workspace);
    const enabled = resolveEnabledRules('marketing', workspace);
    expect(enabled.has('git_preflight')).toBe(false);
  });

  it('10.2 add new rule with existing evaluator and enable in project', () => {
    const workspace = mkWorkspace();
    createGovernanceRule(
      {
        id: 'postflight_quality_gate',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['docs/process/tests/<ticket>.md'],
        evaluationType: 'deterministic',
        deterministicCheck: 'postflight_report',
        enforcementMode: 'soft',
        enabledByDefault: false,
      },
      workspace,
    );
    const rules = loadGovernanceRules(workspace);
    expect(rules.some((r) => r.id === 'postflight_quality_gate')).toBe(true);
    updateProjectPolicy('agent_system', { enabledRules: ['git_preflight', 'postflight_quality_gate'] }, workspace);
    const enabled = resolveEnabledRules('agent_system', workspace);
    expect(enabled.has('postflight_quality_gate')).toBe(true);
  });

  it('10.3 threshold override remains project-scoped', () => {
    const workspace = mkWorkspace();
    createGovernanceRule(
      {
        id: 'cost_guard_light',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['docs/process/runs/cost/<project>.json'],
        evaluationType: 'deterministic',
        deterministicCheck: 'cost_tracker',
        enforcementMode: 'soft',
        enabledByDefault: true,
        thresholds: { dailyUsd: 10 },
      },
      workspace,
    );
    updateProjectPolicy(
      'project-a',
      {
        ruleOverrides: { cost_guard_light: { thresholds: { dailyUsd: 5 } } },
      },
      workspace,
    );
    const policyA = getProjectPolicy('project-a', workspace);
    const policyB = getProjectPolicy('project-b', workspace);
    expect(policyA.ruleOverrides.cost_guard_light?.thresholds?.dailyUsd).toBe(5);
    expect(policyB.ruleOverrides.cost_guard_light).toBeUndefined();
  });

  it('10.4 disable system rule for one project only', () => {
    const workspace = mkWorkspace();
    updateProjectPolicy('project-a', { disabledRules: ['git_preflight'] }, workspace);
    const aEnabled = resolveEnabledRules('project-a', workspace);
    const bEnabled = resolveEnabledRules('project-b', workspace);
    expect(aEnabled.has('git_preflight')).toBe(false);
    expect(bEnabled.has('git_preflight')).toBe(true);
  });

  it('loop entities are first-class, scoped and manually runnable-gated', () => {
    const workspace = mkWorkspace();
    createGovernanceLoop(
      {
        id: 'validation_session',
        kind: 'validation',
        enabledByDefault: true,
        scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' },
      },
      workspace,
    );
    const hit = isGovernanceLoopRunnable(
      { id: 'validation_session', kind: 'validation', enabledByDefault: true, scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' } },
      { projectId: 'project-a', chainId: 'thread-1' },
    );
    const miss = isGovernanceLoopRunnable(
      { id: 'validation_session', kind: 'validation', enabledByDefault: true, scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' } },
      { projectId: 'project-a', chainId: 'thread-2' },
    );
    expect(hit).toBe(true);
    expect(miss).toBe(false);
    const disabled = disableGovernanceLoop('validation_session', { disabled: true }, workspace);
    expect(disabled.disabled).toBe(true);
  });
});
