import { ImprovementProposal, ProposalStatus } from './ImprovementTypes';
export declare class ProposalOrchestrator {
    private proposalsDir;
    constructor(workspacePath: string);
    saveProposal(proposal: ImprovementProposal): Promise<string>;
    getProposal(id: string): ImprovementProposal | null;
    listProposals(filters?: {
        status?: ProposalStatus;
        type?: string;
    }): ImprovementProposal[];
    updateStatus(id: string, status: ProposalStatus): Promise<boolean>;
    generateId(): string;
}
export declare const proposalOrchestrator: ProposalOrchestrator;
