import { VerificationWrapper } from './VerificationWrapper';
import { Task, TaskType, TaskStatus } from '../models/pm-types';

const mockTask: Task = {
  id: 'TASK-1',
  name: 'Implement Logic',
  description: 'Add core business logic',
  type: 'code',
  status: 'verifying',
  acceptanceCriteria: [
    'Logic is correct',
    'Tests are green'
  ],
  dependencies: [],
  assignedRole: 'developer',
  verificationResults: [],
  autoRetryCount: 0
} as any;

console.log('--- TEST: CODE TASK ---');
console.log(VerificationWrapper.getVerificationInstructions(mockTask));

const mockDocsTask: Task = {
  ...mockTask,
  type: 'docs',
  name: 'Update README'
};

console.log('\n--- TEST: DOCS TASK ---');
console.log(VerificationWrapper.getVerificationInstructions(mockDocsTask));
