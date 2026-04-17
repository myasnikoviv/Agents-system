import { ImprovementProposal } from './ImprovementTypes';
import { DetectedPattern } from '../adaptive/PatternDetector';
export declare class ProposalGenerator {
    generateProposal(pattern: DetectedPattern, assetContext: {
        id: string;
        path: string;
        type: string;
        content?: string;
    }): Promise<ImprovementProposal>;
    private classifyType;
    private generateMockPatch;
}
export declare const proposalGenerator: ProposalGenerator;
