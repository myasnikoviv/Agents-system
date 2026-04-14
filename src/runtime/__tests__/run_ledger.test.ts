import { describe, expect, it } from '@jest/globals';
import { classifyFailureReason } from '../RunLedger';
import type { RuntimeEvent } from '../events/EventBus';

function eventWithError(error: string): RuntimeEvent {
  return {
    id: 'ev-123',
    type: 'agent.failed',
    timestamp: Date.now(),
    projectId: 'proj-77',
    runId: 'run-77',
    chainId: 'thread-77',
    actor: {
      type: 'agent',
      id: 'agent-77',
      role: 'TDD QA',
    },
    payload: { error },
  };
}

describe('RunLedger failure taxonomy', () => {
  it('classifies governance policy failures', () => {
    const reason = classifyFailureReason(eventWithError('main_branch_mutation_forbidden:main'));
    expect(reason).toBe('governance_git_policy');
  });

  it('classifies quota/rate failures', () => {
    const reason = classifyFailureReason(eventWithError('rate limit exceeded'));
    expect(reason).toBe('quota_or_rate_limit');
  });

  it('returns none for success', () => {
    const e: RuntimeEvent = {
      ...eventWithError('x'),
      type: 'run.completed',
      payload: { status: 'success' },
    };
    expect(classifyFailureReason(e)).toBe('none');
  });
});
