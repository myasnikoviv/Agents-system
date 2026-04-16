import { GovernanceRule } from './GovernanceEngineTypes';
export interface GovernanceRuleHistoryEntry {
    id: string;
    ruleId: string;
    action: 'create' | 'update' | 'disable' | 'delete';
    timestamp: string;
    actorId: string;
    before: GovernanceRule | null;
    after: GovernanceRule;
}
export declare class GovernanceRegistryError extends Error {
    constructor(message: string);
}
export declare function loadGovernanceRules(workspacePath?: string): GovernanceRule[];
export declare function getRuleById(ruleId: GovernanceRule['id'], workspacePath?: string): GovernanceRule | undefined;
/**
 * Creates a new governance rule and persists it to YAML.
 * AGSYS-2403: Rule Create API
 */
export declare function createGovernanceRule(data: Partial<GovernanceRule>, workspacePath?: string): GovernanceRule;
/**
 * Updates an existing rule and persists the change.
 * AGSYS-2404: Rule Update API
 * AGSYS-2406/2407: Extend Rule Schema & Metadata Persistence
 */
export declare function updateGovernanceRule(id: string, updates: Partial<GovernanceRule>, workspacePath?: string): GovernanceRule;
export declare function disableGovernanceRule(ruleId: string, params?: {
    disabled?: boolean;
    projectId?: string;
}, workspacePath?: string): GovernanceRule;
export declare function deleteGovernanceRule(ruleId: string, params?: {
    force?: boolean;
}, workspacePath?: string): {
    deletedRuleId: string;
    removedFromPolicies: boolean;
};
export declare function listGovernanceRuleHistory(ruleId: string, workspacePath?: string): GovernanceRuleHistoryEntry[];
