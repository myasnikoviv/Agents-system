import { emitEvent } from '../events/EventBus';

/**
 * RunManager handles the lifecycle of runtime runs,
 * particularly for context isolation and cancellation.
 */
export class RunManager {
  private static activeRuns = new Map<string, string>(); // threadId -> runId
  private static cancelledRuns = new Set<string>(); // runId
  private static abortControllers = new Map<string, AbortController>(); // runId -> abort controller

  /**
   * Registers a new run. If a run is already active for the thread, it is cancelled.
   */
  static registerRun(threadId: string, runId: string) {
    const previousRunId = this.activeRuns.get(threadId);
    if (previousRunId && previousRunId !== runId) {
      console.log(`[RunManager] Cancelling previous run ${previousRunId} for thread ${threadId}`);
      this.cancelRun(previousRunId, 'New input received for this thread');
    }
    this.activeRuns.set(threadId, runId);
    this.abortControllers.set(runId, new AbortController());
  }

  /**
   * Marks a run as cancelled.
   */
  static cancelRun(runId: string, reason: string) {
    this.cancelledRuns.add(runId);
    const controller = this.abortControllers.get(runId);
    if (controller && !controller.signal.aborted) {
      controller.abort(`run_cancelled:${reason}`);
    }
    emitEvent({
      type: 'run.cancelled',
      runId,
      projectId: 'none',
      chainId: 'none',
      actor: { type: 'system', id: 'run-manager' },
      payload: { reason }
    });
    
    // Cleanup worker locks immediately on cancellation
    import('../workers/DynamicWorkerSpawnManager')
      .then(({ DynamicWorkerSpawnManager }) => DynamicWorkerSpawnManager.forceReleaseAllLocksForRun(runId))
      .catch(() => undefined);
  }

  /**
   * Returns currently active run id for thread, if any.
   */
  static getActiveRunId(threadId: string): string | null {
    return this.activeRuns.get(threadId) || null;
  }

  /**
   * Cancels active run for a thread.
   */
  static cancelThreadRun(threadId: string, reason: string): { cancelled: boolean; runId: string | null } {
    const runId = this.activeRuns.get(threadId) || null;
    if (!runId) return { cancelled: false, runId: null };
    this.cancelRun(runId, reason);
    return { cancelled: true, runId };
  }

  /**
   * Returns true if the run has been cancelled.
   */
  static isCancelled(runId: string): boolean {
    return this.cancelledRuns.has(runId);
  }

  /**
   * Throws an error if the run has been cancelled.
   */
  static checkCancellation(runId: string) {
    if (this.isCancelled(runId)) {
      throw new Error(`Run ${runId} was cancelled.`);
    }
  }

  /**
   * Returns AbortSignal bound to run lifecycle, if available.
   */
  static getAbortSignal(runId: string): AbortSignal | undefined {
    return this.abortControllers.get(runId)?.signal;
  }

  /**
   * Marks a run as completed and removes it from active tracking.
   */
  static completeRun(threadId: string, runId: string) {
    if (this.activeRuns.get(threadId) === runId) {
      this.activeRuns.delete(threadId);
    }
    // We keep it in cancelledRuns for a short while or just clean up
    this.cancelledRuns.delete(runId);
    this.abortControllers.delete(runId);
    // Clear guardrail counters/timers to avoid stale memory growth.
    import('../guards/Guardrails')
      .then(({ Guardrails }) => Guardrails.clear(runId))
      .catch(() => undefined);
  }
}
