import { emitEvent } from '../events/EventBus';

/**
 * RunManager handles the lifecycle of runtime runs,
 * particularly for context isolation and cancellation.
 */
export class RunManager {
  private static activeRuns = new Map<string, string>(); // threadId -> runId
  private static cancelledRuns = new Set<string>(); // runId

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
  }

  /**
   * Marks a run as cancelled.
   */
  static cancelRun(runId: string, reason: string) {
    this.cancelledRuns.add(runId);
    emitEvent({
      type: 'run.cancelled',
      runId,
      projectId: 'none',
      chainId: 'none',
      actor: { type: 'system', id: 'run-manager' },
      payload: { reason }
    });
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
   * Marks a run as completed and removes it from active tracking.
   */
  static completeRun(threadId: string, runId: string) {
    if (this.activeRuns.get(threadId) === runId) {
      this.activeRuns.delete(threadId);
    }
    // We keep it in cancelledRuns for a short while or just clean up
    this.cancelledRuns.delete(runId);
  }
}
