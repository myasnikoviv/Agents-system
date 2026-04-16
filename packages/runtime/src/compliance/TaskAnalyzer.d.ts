import { CompliancePlan } from './ComplianceTypes';
export declare function analyzeTaskForCompliance(input: {
    runId: string;
    projectId: string;
    ticketId: string;
    message: string;
    requestedPipeline?: string;
    requestedAgents?: string[];
    requestedSkills?: string[];
}): CompliancePlan;
