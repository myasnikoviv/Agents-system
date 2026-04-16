import { proposalOrchestrator } from './ProposalOrchestrator';
import { changeApplier } from './ChangeApplier';
import { ProposalReviewSignal } from './ImprovementTypes';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'list') {
    const list = proposalOrchestrator.listProposals({ status: 'PENDING' });
    console.log('--- Pending Improvement Proposals ---');
    list.forEach(p => {
      console.log(`[${p.id}] Type: ${p.type} | Severity: ${p.severity}`);
      console.log(`  Target: ${p.target.assetId} (${p.target.path})`);
      console.log(`  Description: ${p.change.description}`);
      console.log('------------------------------------');
    });
    return;
  }

  if (command === 'approve' || command === 'reject') {
    const id = args[1];
    if (!id) {
      console.error('Usage: npx ts-node ProposalReviewCLI.ts [approve|reject] [id]');
      return;
    }

    const signal: ProposalReviewSignal = {
      proposalId: id,
      decision: command === 'approve' ? 'APPROVE' : 'REJECT',
      reviewer: 'CLI_USER'
    };

    const proposal = proposalOrchestrator.getProposal(id);
    if (!proposal) {
      console.error(`Proposal ${id} not found.`);
      return;
    }

    if (command === 'approve') {
      console.log(`Applying proposal ${id}...`);
      const success = await changeApplier.applyChange(proposal);
      if (success) {
        await proposalOrchestrator.updateStatus(id, 'APPLIED');
        console.log(`[SUCCESS] Proposal ${id} applied.`);
      } else {
        console.error(`[ERROR] Failed to apply proposal ${id}.`);
      }
    } else {
      await proposalOrchestrator.updateStatus(id, 'REJECTED');
      console.log(`Proposal ${id} rejected.`);
    }
  }
}

main().catch(console.error);
