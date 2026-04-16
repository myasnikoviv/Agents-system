import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getProjectPolicy,
  resolveProjectExecutionProfile,
  resolveProjectGitPolicy,
  updateProjectPolicy,
} from '@system/governance';

function mkWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-profile-'));
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

describe('Project profile and git policy integration', () => {
  it('uses engineering defaults when profile is not set', () => {
    const workspace = mkWorkspace();
    const profile = resolveProjectExecutionProfile('agent_system', workspace);
    const gitPolicy = resolveProjectGitPolicy('agent_system', workspace);
    expect(profile).toBe('engineering');
    expect(gitPolicy.requirePreflightToken).toBe(true);
    expect(gitPolicy.requireWorktreeIsolation).toBe(true);
    expect(gitPolicy.allowGitMutations).toBe(true);
  });

  it('switches to non-engineering defaults and keeps project-scoped policy', () => {
    const workspace = mkWorkspace();
    updateProjectPolicy(
      'marketing',
      {
        executionProfile: 'non_engineering',
      },
      workspace,
    );

    const marketing = getProjectPolicy('marketing', workspace);
    const engineering = getProjectPolicy('agent_system', workspace);
    expect(marketing.executionProfile).toBe('non_engineering');
    expect(marketing.gitPolicy.requirePreflightToken).toBe(false);
    expect(marketing.gitPolicy.requireWorktreeIsolation).toBe(false);
    expect(engineering.executionProfile).toBe('engineering');
    expect(engineering.gitPolicy.requirePreflightToken).toBe(true);
  });

  it('allows profile-driven git policy overrides', () => {
    const workspace = mkWorkspace();
    updateProjectPolicy(
      'marketing',
      {
        executionProfile: 'non_engineering',
        gitPolicy: {
          allowGitMutations: true,
        },
      },
      workspace,
    );
    const policy = resolveProjectGitPolicy('marketing', workspace);
    expect(policy.requirePreflightToken).toBe(false);
    expect(policy.allowGitMutations).toBe(true);
  });
});

