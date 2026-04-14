import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createGovernanceRule,
  deleteGovernanceRule,
  disableGovernanceRule,
  getRuleById,
  listGovernanceRuleHistory,
  loadGovernanceRules,
  updateGovernanceRule,
} from '../governance/RuleRegistry';

function mkWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-lifecycle-'));
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
  fs.writeFileSync(
    path.join(root, 'docs/runtime/governance/project-policy.json'),
    JSON.stringify(
      {
        defaultEnabledRules: ['git_preflight'],
        projects: {
          'proj-a': {
            enabledRules: ['git_preflight', 'custom_quality_loop'],
            disabledRules: [],
            ruleOverrides: {
              custom_quality_loop: {
                evidence: ['docs/process/tests/<ticket>.md'],
                thresholds: { maxRetries: 1 },
              },
            },
          },
        },
      },
      null,
      2,
    ),
    'utf-8',
  );
  return root;
}

describe('RuleRegistry lifecycle', () => {
  it('creates, updates and disables a dynamic rule in catalog storage', () => {
    const workspace = mkWorkspace();

    const created = createGovernanceRule(
      {
        id: 'custom_quality_loop',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['docs/process/tests/<ticket>.md'],
        evaluationType: 'deterministic',
        deterministicCheck: 'postflight_report',
        enforcementMode: 'soft',
        enabledByDefault: true,
        metadata: {
          name: 'Custom Quality Loop',
          description: 'Custom quality verification',
          version: '1.0.0',
          owner: 'qa',
          tags: ['qa', 'quality'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      workspace,
    );

    expect(created.id).toBe('custom_quality_loop');

    const updated = updateGovernanceRule(
      'custom_quality_loop',
      {
        evidence: ['docs/process/tests/<ticket>.md', 'docs/process/reviews/<ticket>.md'],
        thresholds: { maxRetries: 2 },
      },
      workspace,
    );

    expect(updated.evidence).toHaveLength(2);
    expect(updated.thresholds?.maxRetries).toBe(2);
    expect(updated.metadata?.version).toBe('1.0.1');

    const disabled = disableGovernanceRule('custom_quality_loop', { disabled: true }, workspace);
    expect(disabled.disabled).toBe(true);

    const byId = getRuleById('custom_quality_loop', workspace);
    expect(byId?.disabled).toBe(true);

    const list = loadGovernanceRules(workspace);
    expect(list.some((rule) => rule.id === 'custom_quality_loop')).toBe(true);

    const history = listGovernanceRuleHistory('custom_quality_loop', workspace);
    expect(history).toHaveLength(3);
    expect(history[0]?.action).toBe('disable');
    expect(history[1]?.action).toBe('update');
    expect(history[2]?.action).toBe('create');
  });

  it('blocks delete when referenced by project policy and allows force delete', () => {
    const workspace = mkWorkspace();
    createGovernanceRule(
      {
        id: 'custom_quality_loop',
        triggerPhases: ['AFTER_RUN'],
        evidence: ['docs/process/tests/<ticket>.md'],
        evaluationType: 'deterministic',
        deterministicCheck: 'postflight_report',
        enforcementMode: 'soft',
        enabledByDefault: true,
      },
      workspace,
    );

    expect(() => deleteGovernanceRule('custom_quality_loop', { force: false }, workspace)).toThrow(/governance_rule_in_use/);

    const deleted = deleteGovernanceRule('custom_quality_loop', { force: true }, workspace);
    expect(deleted.deletedRuleId).toBe('custom_quality_loop');
    expect(deleted.removedFromPolicies).toBe(true);
    expect(getRuleById('custom_quality_loop', workspace)).toBeUndefined();
  });
});
