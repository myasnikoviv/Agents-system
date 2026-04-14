import fs from 'fs';
import { ImprovementProposal, ImprovementType, ImprovementSeverity } from './ImprovementTypes';
import { DetectedPattern } from '../adaptive/PatternDetector';
import { proposalOrchestrator } from './ProposalOrchestrator';

export class ProposalGenerator {
  public async generateProposal(
    pattern: DetectedPattern,
    assetContext: { id: string; path: string; type: string; content?: string }
  ): Promise<ImprovementProposal> {
    
    // In a real scenario, we would call an LLM here with the pattern and asset content.
    // For this implementation, we use deterministic logic + descriptive reasoning.
    
    const id = proposalOrchestrator.generateId();
    const type = this.classifyType(pattern, assetContext);
    
    const proposal: ImprovementProposal = {
      id,
      sourcePatternId: 'unknown', // DetectedPattern doesn't have an ID yet
      type,
      severity: pattern.severity as ImprovementSeverity,
      target: {
        assetId: assetContext.id,
        path: assetContext.path,
        type: assetContext.type
      },
      change: {
        title: `Self-Improvement: ${pattern.type} optimization for ${assetContext.id}`,
        description: `Automatically suggested improvement based on ${pattern.type} detection.`,
        reasoning: `Pattern detected: ${pattern.type}. Severity: ${pattern.severity}. Evidence: ${JSON.stringify(pattern.comparison)}`,
        suggestedPatch: this.generateMockPatch(pattern, assetContext),
        estimatedImpact: {
          latencyReductionMs: pattern.type === 'LATENCY_DRIFT' ? 200 : 0,
          tokenSavings: pattern.type === 'TOKEN_SPIKE' ? 1000 : 0,
          complianceScoreBoost: pattern.type === 'SUCCESS_DETERIORATION' ? 15 : 0
        }
      },
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    return proposal;
  }

  private classifyType(pattern: DetectedPattern, assetContext: { path: string }): ImprovementType {
    if (assetContext.path.includes('templates/')) return 'TEMPLATE';
    if (pattern.type === 'SYSTEM_ERROR') return 'PRODUCT';
    return 'WORKSPACE';
  }

  private generateMockPatch(pattern: DetectedPattern, assetContext: { id?: string; content?: string }): string {
    // Basic patch logic: e.g. adding a retry strategy or changing model tier recommendation
    if (pattern.type === 'SUCCESS_DETERIORATION') {
      return `// Suggested optimization: Increase temperature for diversity or decrease for precision\n// Current Context: ${assetContext.id || 'unknown'}\n// Action: Adjusting prompts to enforce validation.`;
    }
    return `// Suggested patch for ${pattern.type} in ${assetContext.id || 'unknown'}`;
  }
}

export const proposalGenerator = new ProposalGenerator();
