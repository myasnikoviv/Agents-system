import type { GovernanceEngineContext, GovernancePhase, GovernanceRule } from './GovernanceEngineTypes';
export interface GovernanceManualOverride {
    id: string;
    projectId: string;
    scope: 'global' | 'phase' | 'rule';
    phase?: GovernancePhase;
    ruleId?: GovernanceRule['id'];
    ticketId?: string;
    actorId: string;
    reason: string;
    createdAt: string;
    expiresAt?: string;
    enabled: boolean;
}
export declare function listManualOverrides(workspacePath?: string): GovernanceManualOverride[];
export declare function addManualOverride(input: Omit<GovernanceManualOverride, 'id' | 'createdAt' | 'enabled'> & {
    enabled?: boolean;
}, workspacePath?: string): GovernanceManualOverride;
export declare function resolveManualOverride(input: {
    context: GovernanceEngineContext;
    phase: GovernancePhase;
    ruleId: GovernanceRule['id'];
}): GovernanceManualOverride | null;
