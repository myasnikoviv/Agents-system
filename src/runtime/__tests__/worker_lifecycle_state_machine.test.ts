import { applyLifecycleTransition, canTransition } from '../workers/WorkerLifecycleStateMachine';

describe('WorkerLifecycleStateMachine', () => {
  it('allows deterministic valid transitions', () => {
    expect(canTransition('cold', 'starting')).toBe(true);
    expect(canTransition('starting', 'hot')).toBe(true);
    expect(canTransition('hot', 'active')).toBe(true);
    expect(canTransition('active', 'idle')).toBe(true);
    expect(canTransition('idle', 'active')).toBe(true);
    expect(canTransition('stopping', 'cold')).toBe(true);
    expect(canTransition('failed', 'cold')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    const invalid = applyLifecycleTransition('cold', 'active');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.reason).toContain('invalid_transition:cold->active');
    }
  });
});
