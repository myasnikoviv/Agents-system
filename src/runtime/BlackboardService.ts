import { RunContext, StructuredArtifact } from './context/RunContext';
import { getRedisClient } from './redisClient';

/**
 * BlackboardService provides a structured, hierarchical memory store
 * backed by Redis (simulated for now, or using Redis MCP).
 * 
 * It allows agents to:
 * 1. Publish Shared Facts (long-term knowledge for the current run).
 * 2. Log Decisions (rationale for specific actions).
 * 3. Reference Artifacts (links to generated files/outputs).
 */
export class BlackboardService {
  private static redisPrefix = 'run:';

  /**
   * Hydrates the memory section of the RunContext from the blackboard.
   */
  static async hydrate(context: RunContext): Promise<void> {
    const redis = getRedisClient();
    const runId = context.runId;
    
    try {
      // 1. Fetch Artifacts (List)
      const artifactJsonList = await redis.lrange(`${this.redisPrefix}${runId}:artifacts`, 0, -1);
      context.artifacts.priorOutputs = artifactJsonList.map(s => JSON.parse(s));

      // 2. Fetch Facts (Hash)
      const facts = await redis.hgetall(`${this.redisPrefix}${runId}:facts`);
      context.memory.sharedFacts = Object.fromEntries(
        Object.entries(facts).map(([k, v]) => [k, JSON.parse(v)])
      );

      // 3. Fetch Decisions (Hash)
      const decisions = await redis.hgetall(`${this.redisPrefix}${runId}:decisions`);
      context.memory.runDecisions = Object.fromEntries(
        Object.entries(decisions).map(([k, v]) => [k, JSON.parse(v)])
      );

      // 4. Fetch Handoff Context
      const handoffJson = await redis.get(`${this.redisPrefix}${runId}:handoff`);
      if (handoffJson) {
        context.memory.handoffContext = JSON.parse(handoffJson);
      }

      console.log(`[BlackboardService] Hydrated memory for run ${runId} (${context.artifacts.priorOutputs.length} artifacts)`);
    } catch (err) {
      console.error(`[BlackboardService] Failed to hydrate run ${runId}:`, err);
      // Fallback: system continues with existing in-memory context (degraded mode)
    }
  }

  /**
   * Saves a structured artifact to the blackboard.
   */
  static async saveArtifact(runId: string, artifact: StructuredArtifact): Promise<void> {
    const redis = getRedisClient();
    await redis.rpush(`${this.redisPrefix}${runId}:artifacts`, JSON.stringify(artifact));
    console.log(`[BlackboardService] Saved artifact for stage ${artifact.stageId} in run ${runId}`);
  }

  /**
   * Fetches all artifacts for a given run from the blackboard.
   */
  static async getArtifacts(runId: string): Promise<StructuredArtifact[]> {
    const redis = getRedisClient();
    const artifactJsonList = await redis.lrange(`${this.redisPrefix}${runId}:artifacts`, 0, -1);
    return artifactJsonList.map(s => JSON.parse(s));
  }

  /**
   * Publishes a fact to the shared blackboard.
   */
  static async publishFact(runId: string, key: string, value: any): Promise<void> {
    const redis = getRedisClient();
    await redis.hset(`${this.redisPrefix}${runId}:facts`, key, JSON.stringify(value));
    console.log(`[BlackboardService] Published fact: ${key} for run ${runId}`);
  }

  /**
   * Logs a decision to the blackboard.
   */
  static async logDecision(runId: string, nodeName: string, decision: any): Promise<void> {
    const redis = getRedisClient();
    await redis.hset(`${this.redisPrefix}${runId}:decisions`, nodeName, JSON.stringify(decision));
    console.log(`[BlackboardService] Logged decision from ${nodeName} for run ${runId}`);
  }

  /**
   * Sets the handoff context.
   */
  static async setHandoffContext(runId: string, context: { fromRole: string; toRole: string; summary: string; rationale: string }): Promise<void> {
    const redis = getRedisClient();
    await redis.set(`${this.redisPrefix}${runId}:handoff`, JSON.stringify(context));
    console.log(`[BlackboardService] Set handoff context from ${context.fromRole} to ${context.toRole}`);
  }
}
