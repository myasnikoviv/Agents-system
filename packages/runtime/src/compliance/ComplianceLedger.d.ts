import { ComplianceEvaluationResult } from './ComplianceTypes';
import { ComplianceEnforcementDecision } from './ComplianceEnforcementLoop';
export declare function writeComplianceLedger(result: ComplianceEvaluationResult, decision: ComplianceEnforcementDecision, workspacePath: string): string;
