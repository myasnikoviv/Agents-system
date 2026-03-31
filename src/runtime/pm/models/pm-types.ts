/**
 * PM Workflow Models for Sprint 4 (Autonomous Execution)
 */

export type TaskStatus = 'pending' | 'in_progress' | 'verifying' | 'done' | 'failed' | 'blocked';
export type PackageStatus = 'draft' | 'confirmed' | 'executing' | 'completed' | 'failed';

export type TaskType = 'code' | 'test' | 'docs' | 'research' | 'other';

export interface Task {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  storyId?: string;
  epicId?: string;
  assignedRole?: string;
  acceptanceCriteria?: string[];
  verificationResults?: VerificationReport[];
  autoRetryCount?: number;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  epicId?: string;
  taskIds: string[];
  status: TaskStatus;
}

export interface Epic {
  id: string;
  title: string;
  description?: string;
  storyIds: string[];
  status: TaskStatus;
}

/**
 * TaskPackage represents a structured set of work items (Epics, Stories, Tasks)
 * that can be confirmed by a user and executed autonomously.
 */
export interface TaskPackage {
  id: string;
  projectId: string;
  
  epics: Epic[];
  stories: Story[];
  tasks: Task[];
  
  /**
   * The subset of IDs (Tasks/Stories/Epics) selected for the current execution cycle.
   */
  selectedItems: string[];
  
  status: PackageStatus;
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    owner: string;
  };
}

export interface VerificationReport {
  taskId: string;
  packageId: string;
  status: 'passed' | 'failed' | 'manual_review_required';
  validator: string; // agent role slug
  timestamp: string;
  evidenceLinks: string[];
  autoRetryCount: number;
  failureReason?: string;
}
