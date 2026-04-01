import { TaskPackage, Task, VerificationReport, TaskStatus } from '../models/pm-types';
import { enforcePostflightGate } from '../../governance/PostflightEnforcer';

/**
 * GovernanceLoopEngine orchestrates the state machine of autonomous task execution.
 * It manages transitions between 'pending', 'in_progress', 'verifying', and 'done'.
 */
export class GovernanceLoopEngine {
  // Keep retry policy aligned with runtime guardrails (MAX_RETRIES_PER_STEP = 2).
  private readonly MAX_RETRIES = 2;

  /**
   * Inspects the TaskPackage and returns the next task that requires action.
   */
  public getNextActionableTask(pkg: TaskPackage): Task | null {
    // Priority 1: Tasks currently in 'verifying' (waiting for QA)
    const verifying = pkg.tasks.find(t => pkg.selectedItems.includes(t.id) && t.status === 'verifying');
    if (verifying) return verifying;

    // Priority 2: Tasks marked 'pending' (waiting for Dev)
    const pending = pkg.tasks.find(t => pkg.selectedItems.includes(t.id) && t.status === 'pending');
    if (pending) return pending;

    // Priority 3: Tasks current 'in_progress' (waiting for Dev to finish)
    const inProgress = pkg.tasks.find(t => pkg.selectedItems.includes(t.id) && t.status === 'in_progress');
    if (inProgress) return inProgress;

    return null;
  }

  /**
   * Applies the result of a verification cycle to a task.
   */
  public applyVerificationResult(task: Task, report: VerificationReport): Task {
    const updatedTask = { ...task };
    updatedTask.verificationResults = [...(task.verificationResults || []), report];

    if (report.status === 'passed') {
      // ENF-002 — Task Closure Postflight Hard Gate
      // Blocks moving to 'done' unless evidence exists.
      enforcePostflightGate({
        ticket: task.id.toString(),
      });

      updatedTask.status = 'done';
    } else if (report.status === 'failed') {
      const currentRetries = task.autoRetryCount || 0;
      if (currentRetries < this.MAX_RETRIES) {
        updatedTask.status = 'pending';
        updatedTask.autoRetryCount = currentRetries + 1;
      } else {
        updatedTask.status = 'failed';
      }
    } else {
      updatedTask.status = 'blocked';
    }

    return updatedTask;
  }

  /**
   * Transitions a task to the next logical state.
   */
  public transitionTask(task: Task, nextStatus: TaskStatus): Task {
    return { ...task, status: nextStatus };
  }
}
