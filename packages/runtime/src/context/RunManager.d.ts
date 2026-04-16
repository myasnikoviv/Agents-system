/**
 * RunManager handles the lifecycle of runtime runs,
 * particularly for context isolation and cancellation.
 */
export declare class RunManager {
    private static activeRuns;
    private static cancelledRuns;
    private static abortControllers;
    /**
     * Registers a new run. If a run is already active for the thread, it is cancelled.
     */
    static registerRun(threadId: string, runId: string): void;
    /**
     * Marks a run as cancelled.
     */
    static cancelRun(runId: string, reason: string): void;
    /**
     * Returns currently active run id for thread, if any.
     */
    static getActiveRunId(threadId: string): string | null;
    /**
     * Cancels active run for a thread.
     */
    static cancelThreadRun(threadId: string, reason: string): {
        cancelled: boolean;
        runId: string | null;
    };
    /**
     * Returns true if the run has been cancelled.
     */
    static isCancelled(runId: string): boolean;
    /**
     * Throws an error if the run has been cancelled.
     */
    static checkCancellation(runId: string): void;
    /**
     * Returns AbortSignal bound to run lifecycle, if available.
     */
    static getAbortSignal(runId: string): AbortSignal | undefined;
    /**
     * Marks a run as completed and removes it from active tracking.
     */
    static completeRun(threadId: string, runId: string): void;
}
