import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImprovementProposal, ProposalStatus } from './ImprovementTypes';

export class ProposalOrchestrator {
  private proposalsDir: string;

  constructor(workspacePath: string) {
    this.proposalsDir = path.resolve(workspacePath, 'docs/runtime/improvement/proposals');
    if (!fs.existsSync(this.proposalsDir)) {
      fs.mkdirSync(this.proposalsDir, { recursive: true });
    }
  }

  public async saveProposal(proposal: ImprovementProposal): Promise<string> {
    const filePath = path.join(this.proposalsDir, `${proposal.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf-8');
    return filePath;
  }

  public getProposal(id: string): ImprovementProposal | null {
    const filePath = path.join(this.proposalsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  public listProposals(filters?: { status?: ProposalStatus; type?: string }): ImprovementProposal[] {
    const files = fs.readdirSync(this.proposalsDir).filter(f => f.endsWith('.json'));
    const proposals: ImprovementProposal[] = files.map(f => JSON.parse(fs.readFileSync(path.join(this.proposalsDir, f), 'utf-8')));

    return proposals.filter(p => {
      if (filters?.status && p.status !== filters.status) return false;
      if (filters?.type && p.type !== filters.type) return false;
      return true;
    });
  }

  public async updateStatus(id: string, status: ProposalStatus): Promise<boolean> {
    const proposal = this.getProposal(id);
    if (!proposal) return false;

    proposal.status = status;
    if (status === 'APPLIED') {
      proposal.appliedAt = new Date().toISOString();
    }

    await this.saveProposal(proposal);
    return true;
  }

  public generateId(): string {
    return uuidv4();
  }
}

export const proposalOrchestrator = new ProposalOrchestrator(process.cwd());
