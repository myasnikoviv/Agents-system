import { describe, expect, it } from '@jest/globals';
import { classifyFailureReason } from '../RunLedger';
import type { RuntimeEvent } from '../events/EventBus';

function eventWithError(error: string): RuntimeEvent {
  return {
    event_id: 'ev',
    event_type: 'qa.completed',
    timestamp: new Date().toISOString(),
    plane_issue_id: 'TRADE-77',
    pipeline_run_id: 'run-77',
    thread_id: 'thread-77',
    agent_role: 'TDD QA',
    source_stage: 'qa',
    target_stage: 'developer',
    status: 'failed',
    payload: { error },
    correlation_id: 'TRADE-77',
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
    const e = eventWithError('x');
    e.status = 'success';
    expect(classifyFailureReason(e)).toBe('none');
  });
});
