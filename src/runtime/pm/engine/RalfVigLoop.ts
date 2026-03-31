import { TaskPackage, Task, TaskStatus, PackageStatus, VerificationReport } from '../models/pm-types';
import { GovernanceLoopEngine } from './GovernanceLoopEngine';

export interface RalfVigOptions {
  overnightMode?: boolean;
  onTaskChange?: (task: Task) => void;
  onPackageChange?: (pkg: TaskPackage) => void;
  simulateExecution?: (task: Task) => Promise<void>; 
  simulateVerification?: (task: Task) => Promise<VerificationReport>;
}

/**
 * RalfVigLoop is the autonomous execution engine.
 * It consumes a 'confirmed' TaskPackage and drives it to 'completed'
 * by orchestrating the GovernanceLoopEngine.
 */
export class RalfVigLoop {
  private engine: GovernanceLoopEngine;
  private options: RalfVigOptions;

  constructor(options: RalfVigOptions = {}) {
    this.engine = new GovernanceLoopEngine();
    this.options = { overnightMode: false, ...options };
  }

  /**
   * Starts the autonomous loop for a given TaskPackage.
   */
  public async executePackage(pkg: TaskPackage): Promise<TaskPackage> {
    if (pkg.status !== 'confirmed' && pkg.status !== 'executing') {
      throw new Error(`Cannot execute package in status: ${pkg.status}`);
    }

    pkg.status = 'executing';
    if (this.options.onPackageChange) this.options.onPackageChange(pkg);

    let isRunning = true;

    while (isRunning) {
      const nextTask = this.engine.getNextActionableTask(pkg);

      if (!nextTask) {
        // No actionable tasks. 
        // Are all selected tasks done or failed or blocked?
        const allDone = pkg.selectedItems.every(id => {
          const t = pkg.tasks.find(t => t.id === id);
          return t && (t.status === 'done' || t.status === 'failed' || t.status === 'blocked');
        });

        if (allDone) {
          pkg.status = 'completed';
          if (this.options.onPackageChange) this.options.onPackageChange(pkg);
          isRunning = false;
          continue;
        } else {
          // If overnight mode and we are stuck but not all tasks are done/failed, we might wait or fail the loop.
          // For now, break to avoid infinite loop.
          isRunning = false;
          continue;
        }
      }

      await this.processTask(nextTask, pkg);

      if (!this.options.overnightMode) {
        // In interactive mode, we might pause after one cycle, asking for user confirmation.
        // For pure autonomous "Ralf Vig" mode, we might just continue. 
        // We'll treat overnightMode = true as "never stop until done".
        // If false, maybe it yields. For now, we continue but could yield here.
      }
    }

    return pkg;
  }

  private async processTask(task: Task, pkg: TaskPackage) {
    const taskIndex = pkg.tasks.findIndex(t => t.id === task.id);
    if (taskIndex === -1) return;

    if (task.status === 'pending') {
      // Transition to IN PROGRESS
      const updated = this.engine.transitionTask(task, 'in_progress');
      pkg.tasks[taskIndex] = updated;
      if (this.options.onTaskChange) this.options.onTaskChange(updated);
      
      // Execute
      if (this.options.simulateExecution) {
        await this.options.simulateExecution(updated);
      }
      
      // Transition to VERIFYING
      const verifyingTask = this.engine.transitionTask(updated, 'verifying');
      pkg.tasks[taskIndex] = verifyingTask;
      if (this.options.onTaskChange) this.options.onTaskChange(verifyingTask);
      
    } else if (task.status === 'in_progress') {
      // In case we picked it up mid-flight, transition to verifying
      const verifyingTask = this.engine.transitionTask(task, 'verifying');
      pkg.tasks[taskIndex] = verifyingTask;
      if (this.options.onTaskChange) this.options.onTaskChange(verifyingTask);

    } else if (task.status === 'verifying') {
      // Verify
      let report: VerificationReport | null = null;
      if (this.options.simulateVerification) {
        report = await this.options.simulateVerification(task);
      } else {
        throw new Error('No verification logic provided.');
      }

      const updated = this.engine.applyVerificationResult(task, report);
      pkg.tasks[taskIndex] = updated;
      if (this.options.onTaskChange) this.options.onTaskChange(updated);
    }
  }
}
