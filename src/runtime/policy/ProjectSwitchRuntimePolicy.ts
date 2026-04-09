import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';

export interface ProjectSwitchPolicyResult {
  activeProjectId: string;
  cleanedProjects: string[];
  removedIdleWorkers: number;
  removedQueuedTasks: number;
}

export async function applyProjectSwitchRuntimePolicy(input: {
  activeProjectId: string;
  knownProjectIds: string[];
}): Promise<ProjectSwitchPolicyResult> {
  const activeProjectId = String(input.activeProjectId || '').trim();
  const knownProjectIds = Array.from(new Set((input.knownProjectIds || []).map((p) => String(p || '').trim()).filter(Boolean)));
  const cleanedProjects = knownProjectIds.filter((p) => p !== activeProjectId);

  let removedIdleWorkers = 0;
  let removedQueuedTasks = 0;
  for (const projectId of cleanedProjects) {
    const workerResult = DynamicWorkerSpawnManager.pruneIdleWorkers({
      projectId,
      now: Date.now() + 2000,
      idleTimeoutMs: 1000,
    });
    removedIdleWorkers += workerResult.removed;
    removedQueuedTasks += ProjectDispatchQueue.clearProject(projectId);
  }

  return {
    activeProjectId,
    cleanedProjects,
    removedIdleWorkers,
    removedQueuedTasks,
  };
}
