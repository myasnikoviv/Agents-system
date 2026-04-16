import { RunContext } from './RunContext';

/**
 * ReclassificationCheckpoint provides logic to detect if the current execution 
 * context has drifted from the original intent, requiring a pipeline reroute.
 */
export class ReclassificationCheckpoint {
  /**
   * Analyzes the last agent output to determine if a reclassification is needed.
   * Currently uses simple keyword detection, but can be expanded to LLM-based drift analysis.
   */
  static async detectDrift(context: RunContext, lastOutput: string): Promise<{
    shouldReroute: boolean;
    newIntent?: string;
    newPipeline?: string;
    reason?: string;
  }> {
    const output = lastOutput.toLowerCase();

    // 1. Explicit request to change task
    if (output.includes('change of plans') || output.includes('new task:') || output.includes('abort current pipeline')) {
      return {
        shouldReroute: true,
        reason: 'Explicit request for task change detected in agent output.'
      };
    }

    // 2. Role mismatch (Agent thinks it should be another role)
    if (output.includes('this requires a trader analyst') && context.agent.slug !== 'trader-analyst') {
      return {
        shouldReroute: true,
        newIntent: 'trader-analysis',
        newPipeline: 'strategy-tuning',
        reason: 'Agent indicated a need for specialized role outside current path.'
      };
    }

    // 3. Escalation
    if (output.includes('i am stuck') || output.includes('cannot proceed without human')) {
      return {
        shouldReroute: true,
        newIntent: 'conversational',
        newPipeline: 'unified-task-intake',
        reason: 'Agent requested human intervention or reported being stuck.'
      };
    }

    return { shouldReroute: false };
  }
}
