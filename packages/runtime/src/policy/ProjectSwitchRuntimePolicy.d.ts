export interface ProjectSwitchPolicyResult {
    activeProjectId: string;
    cleanedProjects: string[];
    removedIdleWorkers: number;
    removedQueuedTasks: number;
}
export declare function applyProjectSwitchRuntimePolicy(input: {
    activeProjectId: string;
    knownProjectIds: string[];
}): Promise<ProjectSwitchPolicyResult>;
