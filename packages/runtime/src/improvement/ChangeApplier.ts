import fs from 'fs';
import path from 'path';
import { ImprovementProposal } from './ImprovementTypes';
import { assetRegistryV2 } from '../registries/AssetRegistryV2';

export class ChangeApplier {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  public async applyChange(proposal: ImprovementProposal): Promise<boolean> {
    switch (proposal.type) {
      case 'WORKSPACE':
        return this.applyWorkspacePatch(proposal);
      case 'TEMPLATE':
        return this.applyTemplatePromotion(proposal);
      case 'PRODUCT':
        return this.createProductTicket(proposal);
      default:
        return false;
    }
  }

  private async applyWorkspacePatch(proposal: ImprovementProposal): Promise<boolean> {
    const targetPath = path.resolve(this.workspacePath, proposal.target.path);
    if (!fs.existsSync(targetPath)) return false;

    // In a real system, we would parse the suggestedPatch (e.g. as a diff) and apply it.
    // For this implementation, we append the reasoning/patch as a comment to simulate the change.
    
    const content = fs.readFileSync(targetPath, 'utf-8');
    const update = `\n\n/* SELF-IMPROVEMENT APPLIED [${proposal.id}]\n * Reasoning: ${proposal.change.reasoning}\n * Patch: ${proposal.change.suggestedPatch}\n */\n`;
    
    fs.appendFileSync(targetPath, update, 'utf-8');

    // AGSYS-35R: Sync registry after mutation
    if (proposal.target.assetId) {
      await assetRegistryV2.refreshAsset(proposal.target.assetId);
    }
    
    return true;
  }

  private async applyTemplatePromotion(proposal: ImprovementProposal): Promise<boolean> {
    // Promotion of a workspace fix into a template
    // Target path in proposal would be the template file path
    const targetPath = path.resolve(this.workspacePath, proposal.target.path);
    if (!fs.existsSync(targetPath)) return false;

    const promotionMark = `\n\n/* TEMPLATE VERSION BUMP [${proposal.id}] - Verified via Workspace Improvement */\n`;
    fs.appendFileSync(targetPath, promotionMark, 'utf-8');

    // AGSYS-35R: Sync registry after promotion
    if (proposal.target.assetId) {
      await assetRegistryV2.refreshAsset(proposal.target.assetId);
    }

    return true;
  }

  private async createProductTicket(proposal: ImprovementProposal): Promise<boolean> {
    // Integrate with Plane API (similar to sync_to_plane logic)
    // For now, we simulate this by writing a new ticket file to docs/process/tickets/
    const ticketId = `AGSYS-PRODUCT-${proposal.id.slice(0, 4)}`.toUpperCase();
    const ticketPath = path.resolve(this.workspacePath, `docs/process/tickets/${ticketId}.md`);
    
    const ticketContent = `# [IMPROVEMENT] ${proposal.change.title}\n\n` +
      `## Description\n${proposal.change.description}\n\n` +
      `## Reasoning\n${proposal.change.reasoning}\n\n` +
      `## Suggested Implementation\n${proposal.change.suggestedPatch}\n\n` +
      `- Stage: backlog\n- Pipeline: product-roadmap\n- Source: Self-Improvement Loop\n`;

    fs.writeFileSync(ticketPath, ticketContent, 'utf-8');
    return true;
  }
}

export const changeApplier = new ChangeApplier(process.cwd());
