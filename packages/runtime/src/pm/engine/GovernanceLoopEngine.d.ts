import { TaskPackage, Task, VerificationReport, TaskStatus } from '../models/pm-types';
/**
 * GovernanceLoopEngine orchestrates the state machine of autonomous task execution.
 * It manages transitions between 'pending', 'in_progress', 'verifying', and 'done'.
 */
export declare class GovernanceLoopEngine {
    private readonly MAX_RETRIES;
    /**
     * Inspects the TaskPackage and returns the next task that requires action.
     */
    getNextActionableTask(pkg: TaskPackage): Task | null;
    /**
     * Applies the result of a verification cycle to a task.
     */
    applyVerificationResult(task: Task, report: VerificationReport): Promise<Task>;
    /**
     * Transitions a task to the next logical state.
     */
    transitionTask(task: Task, nextStatus: TaskStatus): Task;
}
