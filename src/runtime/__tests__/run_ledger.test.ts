import { describe, expect, it } from '@jest/globals';
import { classifyFailureReason } from '../RunLedger';
import type { RuntimeEvent } from '../events/EventBus';

function eventWithError(error: string): RuntimeEvent {
  return {
    event_id: 'ev',
    type: 'qa.completed',
    timestamp: new Date().toISOString(),
    ticketId: 'TRADE-77',
    runId: 'run-77',
    threadId: 'thread-77',
    actorRole: 'TDD QA',
    sourceStage: 'qa',
    targetStage: 'developer',
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
