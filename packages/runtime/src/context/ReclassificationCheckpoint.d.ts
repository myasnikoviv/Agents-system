import { RunContext } from './RunContext';
/**
 * ReclassificationCheckpoint provides logic to detect if the current execution
 * context has drifted from the original intent, requiring a pipeline reroute.
 */
export declare class ReclassificationCheckpoint {
    /**
     * Analyzes the last agent output to determine if a reclassification is needed.
     * Currently uses simple keyword detection, but can be expanded to LLM-based drift analysis.
     */
    static detectDrift(context: RunContext, lastOutput: string): Promise<{
        shouldReroute: boolean;
        newIntent?: string;
        newPipeline?: string;
        reason?: string;
    }>;
}
