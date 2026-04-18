import { applyPerformanceAwarePolicy, ModelRouteDecision } from '../src/runtime/adaptive/AdaptiveIntelligenceEngine';
import { DetectedPattern } from '../src/runtime/adaptive/PatternDetector';
const { changeApplier } = require('../src/runtime/improvement/ChangeApplier');
const { proposalOrchestrator } = require('../src/runtime/improvement/ProposalOrchestrator');
import fs from 'fs';
import path from 'path';

async function testImprovementLoop() {
  const workspacePath = process.cwd();
  
  // 1. Mock a problematic decision that should trigger patterns
  // We'll simulate a situation where SignalAggregator would return high failure rates
  // But since we are testing the Engine integration, we'll rely on our mock SignalAggregator
  
  const decision: ModelRouteDecision = {
    runId: 'test-run-' + Date.now(),
    projectId: 'test-project',
    taskType: 'refactor',
    modelTier: 'medium',
    model: 'gpt-4o',
    reason: 'test'
  };

  console.log('--- Phase 1: Manually Triggering Proposal Generation (Mock Pattern) ---');
  
  const mockPattern: DetectedPattern = {
    type: 'SUCCESS_DETERIORATION',
    severity: 'critical',
    detail: 'Mock test pattern',
    comparison: { recent: 0.4, historical: 0.9 }
  };

  const assetContext = {
    id: 'AGSYS-3510',
    path: 'docs/process/tickets/AGSYS-3510.md',
    type: 'asset'
  };

  const { proposalGenerator } = require('../src/runtime/improvement/ProposalGenerator');
  const proposal = await proposalGenerator.generateProposal(mockPattern, assetContext);
  await proposalOrchestrator.saveProposal(proposal);
  
  console.log('Proposal generated and saved.');

  const proposalsDir = path.resolve(workspacePath, 'docs/runtime/improvement/proposals');
  const files = fs.readdirSync(proposalsDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} proposals generated.`);

  if (files.length > 0) {
    const proposalPath = path.join(proposalsDir, files[0]);
    const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf-8'));
    console.log(`Top Proposal: ${proposal.change.title} [Status: ${proposal.status}]`);
    
    console.log('--- Phase 2: Simulating Approval via CLI Logic ---');
    // We'll manually call the CLI logic here for brevity
    
    const success = await changeApplier.applyChange(proposal);
    if (success) {
      await proposalOrchestrator.updateStatus(proposal.id, 'APPLIED');
      console.log('Proposal Applied successfully.');
    }
  }
}

testImprovementLoop().catch(console.error);
