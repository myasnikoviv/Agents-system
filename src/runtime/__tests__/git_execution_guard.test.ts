import { describe, expect, it } from '@jest/globals';
import { validateMainBranchMutationPolicy } from '../GitExecutionGuard';

describe('GitExecutionGuard', () => {
  it('blocks mutating action on main', () => {
    const result = validateMainBranchMutationPolicy({
      context: { branch: 'main', worktreePath: '/tmp/wt' },
      hasMutatingAction: true,
    });
    expect(result.ok).toBe(false);
    expect(String(result.reason || '')).toContain('main_branch_mutation_forbidden');
  });

  it('allows non-main mutating action', () => {
    const result = validateMainBranchMutationPolicy({
      context: { branch: 'codex/AGSYS-79', worktreePath: '/tmp/wt' },
      hasMutatingAction: true,
    });
    expect(result.ok).toBe(true);
  });

  it('allows non-mutating action on main', () => {
    const result = validateMainBranchMutationPolicy({
      context: { branch: 'main', worktreePath: '/tmp/wt' },
      hasMutatingAction: false,
    });
    expect(result.ok).toBe(true);
  });
});
