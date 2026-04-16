import type { PlannerDecision } from '@system/shared';
export interface PlannerInput {
    runId: string;
    projectId: string;
    ticketId: string;
    message: string;
    requestedPipeline?: string;
    requestedAgents?: string[];
    requestedSkills?: string[];
}
export declare function buildPlannerDecision(input: PlannerInput): PlannerDecision;
