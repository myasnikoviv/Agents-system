export type ImprovementType = 'WORKSPACE' | 'TEMPLATE' | 'PRODUCT';
export type ProposalStatus = 'PENDING' | 'SIMULATING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
export type ImprovementSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface ImprovementProposal {
    id: string;
    sourcePatternId: string;
    type: ImprovementType;
    severity: ImprovementSeverity;
    target: {
        assetId: string;
        path: string;
        type: string;
    };
    change: {
        title: string;
        description: string;
        suggestedPatch?: string;
        reasoning: string;
        estimatedImpact?: {
            latencyReductionMs?: number;
            tokenSavings?: number;
            complianceScoreBoost?: number;
        };
    };
    status: ProposalStatus;
    createdAt: string;
    appliedAt?: string;
}
export interface ProposalReviewSignal {
    proposalId: string;
    decision: 'APPROVE' | 'REJECT';
    reviewer: string;
    comment?: string;
}
