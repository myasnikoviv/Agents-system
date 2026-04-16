import { GovernanceRuleMetadata, GovernanceRuleScope } from './GovernanceEngineTypes';
export type GovernanceLoopKind = 'improvement' | 'validation';
export interface GovernanceLoopEntity {
    id: string;
    kind: GovernanceLoopKind;
    enabledByDefault: boolean;
    disabled?: boolean;
    scope?: GovernanceRuleScope;
    metadata?: GovernanceRuleMetadata;
    config?: Record<string, unknown>;
}
export declare class GovernanceLoopRegistryError extends Error {
    constructor(message: string);
}
export declare function loadGovernanceLoopsFromDisk(workspacePath?: string): GovernanceLoopEntity[];
export declare function loadGovernanceLoops(workspacePath?: string): GovernanceLoopEntity[];
export declare function getGovernanceLoopById(loopId: string, workspacePath?: string): GovernanceLoopEntity | undefined;
export declare function createGovernanceLoop(input: Omit<GovernanceLoopEntity, 'metadata'> & {
    metadata?: GovernanceLoopEntity['metadata'];
}, workspacePath?: string): GovernanceLoopEntity;
export declare function updateGovernanceLoop(loopId: string, patch: Partial<GovernanceLoopEntity>, workspacePath?: string): GovernanceLoopEntity;
export declare function disableGovernanceLoop(loopId: string, params?: {
    disabled?: boolean;
}, workspacePath?: string): GovernanceLoopEntity;
export declare function isGovernanceLoopRunnable(loop: GovernanceLoopEntity, input: {
    projectId: string;
    chainId: string;
}): boolean;
