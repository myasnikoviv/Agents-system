import { RalfVigLoop } from './src/runtime/pm/engine/RalfVigLoop';
import { TaskPackage, Task, TaskStatus, PackageStatus, VerificationReport } from './src/runtime/pm/models/pm-types';

const mockTasks: Task[] = [
  { id: 'T-1', name: 'Task 1', type: 'code', description: 'desc', status: 'pending', acceptanceCriteria: ['ac1'], autoRetryCount: 0 },
  { id: 'T-2', name: 'Task 2', type: 'test', description: 'desc', status: 'pending', acceptanceCriteria: ['ac2'], autoRetryCount: 0 }
];

const mockPackage: TaskPackage = {
  id: 'PKG-1',
  projectId: 'PROJ-1',
  epics: [],
  stories: [],
  tasks: mockTasks,
  selectedItems: ['T-1', 'T-2'],
  status: 'confirmed',
  metadata: { createdAt: '', updatedAt: '', version: '', owner: '' }
};

const loop = new RalfVigLoop({
  overnightMode: true,
  onTaskChange: (task) => {
    console.log(`[Task ${task.id}] Status changed to => ${task.status}`);
  },
  onPackageChange: (pkg) => {
    console.log(`[Package ${pkg.id}] Status changed to => ${pkg.status}`);
  },
  simulateExecution: async (task) => {
    console.log(`[EXECUTION] Agent working on Task ${task.id}...`);
    await new Promise(r => setTimeout(r, 100));
  },
  simulateVerification: async (task) => {
    console.log(`[VERIFICATION] Verifying Task ${task.id}...`);
    await new Promise(r => setTimeout(r, 100));

    // Simulate 50% failure on first try
    const shouldFail = task.autoRetryCount === 0 && Math.random() > 0.5;

    return {
      taskId: task.id,
      packageId: 'PKG-1',
      status: shouldFail ? 'failed' : 'passed',
      validator: 'tdd-qa',
      timestamp: new Date().toISOString(),
      evidenceLinks: [],
      autoRetryCount: task.autoRetryCount || 0,
      failureReason: shouldFail ? 'Random mock failure' : undefined
    };
  }
});

console.log('--- STARTING RALF VIG AUTONOMOUS LOOP ---');
loop.executePackage(mockPackage).then(finalPkg => {
  console.log('\n--- LOOP FINISHED ---');
  console.log(`Final Package Status: ${finalPkg.status}`);
  finalPkg.tasks.forEach(t => {
    console.log(`Task ${t.id} => Final Status: ${t.status}, Retries: ${t.autoRetryCount}`);
  });
}).catch(console.error);
