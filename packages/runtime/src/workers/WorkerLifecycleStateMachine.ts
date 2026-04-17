export type WorkerLifecycleState = 'cold' | 'starting' | 'hot' | 'active' | 'idle' | 'stopping' | 'failed';

const ALLOWED_TRANSITIONS: Record<WorkerLifecycleState, WorkerLifecycleState[]> = {
  cold: ['starting'],
  starting: ['hot', 'failed'],
  hot: ['active', 'stopping', 'failed'],
  active: ['idle', 'stopping', 'failed'],
  idle: ['active', 'stopping', 'failed'],
  stopping: ['cold', 'failed'],
  failed: ['cold'],
};

export function canTransition(from: WorkerLifecycleState, to: WorkerLifecycleState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) || false;
}

export function applyLifecycleTransition(
  from: WorkerLifecycleState,
  to: WorkerLifecycleState,
): { ok: true; to: WorkerLifecycleState } | { ok: false; reason: string } {
  if (from === to) return { ok: true, to };
  if (!canTransition(from, to)) {
    return { ok: false, reason: `invalid_transition:${from}->${to}` };
  }
  return { ok: true, to };
}
