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
  private static redisPrefix = 'agsys:';

  /**
   * Generates a hierarchical Redis key based on the Memory Contract Spec.
   * Format: agsys:{projectId}:{chainId}:{runId}:{entity}
   */
  private static getKey(context: { projectId: string; chainId: string; runId: string }, entity: string): string {
    return `${this.redisPrefix}${context.projectId}:${context.chainId}:${context.runId}:${entity}`;
  }

  /**
   * Hydrates the memory section of the RunContext from the blackboard.
   */
  static async hydrate(context: RunContext): Promise<void> {
    const redis = getRedisClient();
    const { projectId, chainId, runId } = context;
    
    try {
      // 1. Fetch Artifacts (List)
      const artifactJsonList = await redis.lrange(this.getKey(context, 'artifacts'), 0, -1);
      context.artifacts.priorOutputs = artifactJsonList.map(s => JSON.parse(s));

      // 2. Fetch Facts (Hash) - Run Level
      const runFacts = await redis.hgetall(this.getKey(context, 'facts:run'));
      
      // 3. Fetch Facts (Hash) - Chain Level (Hydration rule: Chain facts take precedence over Run facts if keys collide, or they are merged)
      const chainFacts = await redis.hgetall(this.getKey({ projectId, chainId, runId: 'shared' }, 'facts:chain'));
      
      // 4. Fetch Facts (Hash) - Project Level
      const projectFacts = await redis.hgetall(this.getKey({ projectId, chainId: 'shared', runId: 'shared' }, 'facts:project'));

      context.memory.sharedFacts = {
        ...Object.fromEntries(Object.entries(projectFacts).map(([k, v]) => [k, JSON.parse(v)])),
        ...Object.fromEntries(Object.entries(chainFacts).map(([k, v]) => [k, JSON.parse(v)])),
        ...Object.fromEntries(Object.entries(runFacts).map(([k, v]) => [k, JSON.parse(v)]))
      };

      // 5. Fetch Decisions (Hash)
      const decisions = await redis.hgetall(this.getKey(context, 'decisions'));
      context.memory.runDecisions = Object.fromEntries(
        Object.entries(decisions).map(([k, v]) => [k, JSON.parse(v)])
      );

      // 6. Fetch Handoff Context
      const handoffJson = await redis.get(this.getKey(context, 'handoff'));
      if (handoffJson) {
        context.memory.handoffContext = JSON.parse(handoffJson);
      }

      console.log(`[BlackboardService] Hydrated memory for ${projectId}/${chainId}/${runId}`);
    } catch (err) {
      console.error(`[BlackboardService] Failed to hydrate ${runId}:`, err);
    }
  }

  /**
   * Saves a structured artifact to the blackboard.
   */
  static async saveArtifact(context: { projectId: string; chainId: string; runId: string }, artifact: StructuredArtifact): Promise<void> {
    const redis = getRedisClient();
    await redis.rpush(this.getKey(context, 'artifacts'), JSON.stringify(artifact));
    console.log(`[BlackboardService] Saved artifact for run ${context.runId}`);
  }

  /**
   * Publishes a fact to the shared blackboard at a specific level.
   */
  static async publishFact(
    context: { projectId: string; chainId: string; runId: string }, 
    key: string, 
    value: any, 
    level: 'run' | 'chain' | 'project' = 'run'
  ): Promise<void> {
    const redis = getRedisClient();
    let effectiveContext = { ...context };
    
    if (level === 'project') {
      effectiveContext.chainId = 'shared';
      effectiveContext.runId = 'shared';
    } else if (level === 'chain') {
      effectiveContext.runId = 'shared';
    }

    const redisKey = this.getKey(effectiveContext, `facts:${level}`);
    await redis.hset(redisKey, key, JSON.stringify(value));
    console.log(`[BlackboardService] Published ${level} fact: ${key}`);
  }

  /**
   * Logs a decision to the blackboard.
   */
  static async logDecision(context: { projectId: string; chainId: string; runId: string }, nodeName: string, decision: any): Promise<void> {
    const redis = getRedisClient();
    await redis.hset(this.getKey(context, 'decisions'), nodeName, JSON.stringify(decision));
  }

  /**
   * Sets the handoff context.
   */
  static async setHandoffContext(context: { projectId: string; chainId: string; runId: string }, handoff: { fromRole: string; toRole: string; summary: string; rationale: string }): Promise<void> {
    const redis = getRedisClient();
    await redis.set(this.getKey(context, 'handoff'), JSON.stringify(handoff));
  }
}
