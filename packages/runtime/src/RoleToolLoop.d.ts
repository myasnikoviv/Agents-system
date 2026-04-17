import { GitExecutionContext } from './GitExecutionGuard';
export interface RoleExecutionEnvelope {
    role: string;
    pipeline: string;
    stage: string;
    ticketId: string;
    threadId: string;
    allowedTools: string[];
    guardrails: string[];
}
export interface PlannedToolAction {
    tool: string;
    purpose: string;
}
export declare function getAllowedToolsForRole(role: string): string[];
export declare function buildRoleExecutionEnvelope(input: {
    role: string;
    pipeline: string;
    stage: string;
    ticketId: string;
    threadId: string;
}): RoleExecutionEnvelope;
export declare function validatePlannedToolActions(envelope: RoleExecutionEnvelope, plannedActions: PlannedToolAction[], executionContext?: GitExecutionContext, options?: {
    preflightDir?: string;
}): {
    ok: boolean;
    blockedReason?: string;
};
