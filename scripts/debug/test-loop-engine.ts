import { GovernanceLoopEngine } from './src/runtime/pm/engine/GovernanceLoopEngine';
import { Task, VerificationReport } from './src/runtime/pm/models/pm-types';

const engine = new GovernanceLoopEngine();

const mockTask: Task = {
  id: 'TASK-1',
  name: 'Test Task',
  type: 'code',
  description: 'A test task',
  status: 'pending',
  assignedRole: 'developer',
  autoRetryCount: 0,
  verificationResults: [],
  acceptanceCriteria: ['Condition 1']
};

console.log('--- Actionable Task Test ---');
const pkg = {
  id: 'PKG-1',
  projectId: 'PROJ-1',
  epics: [],
  stories: [],
  tasks: [mockTask],
  selectedItems: ['TASK-1'],
  status: 'confirmed' as any,
  metadata: { createdAt: '', updatedAt: '', version: '', owner: '' }
};

console.log('Next Task (Pending):', engine.getNextActionableTask(pkg)?.status);

const inProgressTask = engine.transitionTask(mockTask, 'in_progress');
pkg.tasks[0] = inProgressTask;
console.log('Next Task (In Progress):', engine.getNextActionableTask(pkg)?.status);

const verifyingTask = engine.transitionTask(inProgressTask, 'verifying');
pkg.tasks[0] = verifyingTask;
console.log('Next Task (Verifying):', engine.getNextActionableTask(pkg)?.status);

console.log('\n--- Verification Result Test ---');
const failedReport: VerificationReport = {
  taskId: 'TASK-1',
  packageId: 'PKG-1',
  status: 'failed',
  validator: 'tdd-qa',
  timestamp: new Date().toISOString(),
  evidenceLinks: [],
  autoRetryCount: 0
};

const retriedTask = engine.applyVerificationResult(verifyingTask, failedReport);
console.log('Task Status after fail (Retry 1):', retriedTask.status, '| Retry Count:', retriedTask.autoRetryCount);

const passedReport: VerificationReport = { ...failedReport, status: 'passed' };
const doneTask = engine.applyVerificationResult(verifyingTask, passedReport);
console.log('Task Status after pass:', doneTask.status);
