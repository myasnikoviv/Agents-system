import { Task, TaskType } from '../models/pm-types';

export class VerificationWrapper {
  /**
   * Generates a specialized verification instruction block based on task type.
   * This decouples verification logic from agent templates.
   */
  static getVerificationInstructions(task: Task): string {
    const baseInstructions = `
### MANDATORY VERIFICATION MODE
You are now in VERIFICATION mode. Your goal is to strictly validate the work done for the task below against its Acceptance Criteria.

**Task to Verify:**
- **Name:** ${task.name}
- **Type:** ${task.type}
- **Acceptance Criteria:**
${task.acceptanceCriteria.map(ac => `  - [ ] ${ac}`).join('\n')}

**Verification Logic:**
`;

    let specializedLogic = '';

    switch (task.type) {
      case 'code':
        specializedLogic = `
1. Check if the code implements all requested logic.
2. Verify that there are no obvious bugs or edge cases missed.
3. Ensure the code follows the project's architectural patterns.
`;
        break;
      case 'test':
        specializedLogic = `
1. Verify that the tests actually cover the target logic.
2. Check if the tests pass in the current environment.
3. Ensure tests use meaningful assertions, not just 'truthy' checks.
`;
        break;
      case 'docs':
        specializedLogic = `
1. Check for clarity, accuracy, and completeness of the documentation.
2. Verify that all links and references are valid.
3. Ensure the formatting is consistent with the project style.
`;
        break;
      default:
        specializedLogic = `
1. Perform a general quality audit based on the task description.
2. Ensure the output meets the definition of 'Done' for this task.
`;
    }

    const outputContract = `
**Output Contract:**
You MUST return a JSON object in the following format:
\`\`\`json
{
  "taskId": "${task.id}",
  "status": "passed" | "failed",
  "score": 0-100,
  "feedback": "Detailed explanation of findings",
  "missingCriteria": ["List of ACs not met"],
  "reproducibleSteps": "Command to run to see the failure (if any)"
}
\`\`\`
`;

    return baseInstructions + specializedLogic + outputContract;
  }

  /**
   * Determines the appropriate agent role for verifying a given task type.
   */
  static getVerifierForTask(taskType: TaskType): string {
    switch (taskType) {
      case 'code':
        return 'tdd-qa';
      case 'test':
        return 'code-reviewer';
      case 'docs':
        return 'documentation-owner';
      case 'research':
        return 'pm-orchestrator';
      default:
        return 'pm-orchestrator';
    }
  }
}
