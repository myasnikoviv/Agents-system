import { ComplianceEvaluationResult } from './ComplianceTypes';
export interface ComplianceEnforcementDecision {
    action: 'allow' | 'retry' | 'deviation';
    retryCount: number;
    reason: string;
}
export declare function applyComplianceEnforcement(result: ComplianceEvaluationResult): ComplianceEnforcementDecision;
export declare function resetComplianceEnforcementState(): void;
