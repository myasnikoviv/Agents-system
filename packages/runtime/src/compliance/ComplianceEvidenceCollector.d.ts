import { ComplianceActualEvidence } from './ComplianceTypes';
export declare function collectComplianceActualEvidence(input: {
    runId: string;
    defaultPipeline?: string;
    workspacePath: string;
}): Promise<ComplianceActualEvidence>;
