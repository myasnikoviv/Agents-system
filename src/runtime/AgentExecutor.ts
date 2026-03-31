import { appendSkillUsage } from './SkillTelemetryRegistry';
import { loadConfig } from './CockpitExecutorConfig';
import { RunContext } from './context/RunContext';
import { ExecutionAdapter, ExecutionResult } from './adapters/ExecutionAdapter';
import { ClaudeCliAdapter } from './adapters/ClaudeCliAdapter';
import { CodexCliAdapter } from './adapters/CodexCliAdapter';
import { OpenHandsAdapter } from './adapters/OpenHandsAdapter';
import { LangChainAdapter } from './adapters/LangChainAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { SkillRegistry } from './registries/SkillRegistry';
import { BlackboardService } from './BlackboardService';
import { NativeToolLoopRunner } from './NativeToolLoopRunner';

export class AgentExecutor {
  constructor() {}

  private resolveBackendFromContext(
    context: RunContext,
    fallback: 'claude-cli' | 'codex-cli' | 'openhands-sdk',
  ): 'claude-cli' | 'codex-cli' | 'openhands-sdk' {
    if (context.executionTarget === 'claude-cli') return 'claude-cli';
    if (context.executionTarget === 'codex-cli') return 'codex-cli';
    if (context.executionTarget === 'openhands') return 'openhands-sdk';
    return fallback;
  }

  async run(context: RunContext, providedAdapter?: ExecutionAdapter): Promise<ExecutionResult> {
    const cfg = loadConfig(context.workspacePath);
    const backend = this.resolveBackendFromContext(context, cfg.backend);

    // Keep runtime contract consistent for downstream adapters/telemetry.
    if (backend === 'claude-cli') {
      context.executionTarget = 'claude-cli';
      context.provider = 'claude-cli';
      context.model = cfg.claude.model;
    } else if (backend === 'codex-cli') {
      context.executionTarget = 'codex-cli';
      context.provider = 'codex-cli';
      context.model = cfg.codex.model;
    } else if (backend === 'openhands-sdk') {
      context.executionTarget = 'openhands';
      context.provider = 'openhands-sdk';
      context.model = cfg.openhands.model;
    }
    
    let adapter: ExecutionAdapter;
    
    if (providedAdapter) {
      adapter = providedAdapter;
    } else if (backend === 'claude-cli') {
      adapter = new ClaudeCliAdapter();
    } else if (backend === 'codex-cli') {
      adapter = new CodexCliAdapter();
    } else if (backend === 'openhands-sdk') {
      adapter = new OpenHandsAdapter();
    } else if (process.env.GOOGLE_API_KEY) {
      adapter = new GeminiAdapter(process.env.GOOGLE_API_KEY, process.env.GOOGLE_MODEL || 'gemini-1.5-flash');
    } else {
      // Default to LangChain/Direct OpenAI
      adapter = new LangChainAdapter(process.env.OPENAI_API_KEY || '');
    }

    const startedAt = Date.now();
    const runner = new NativeToolLoopRunner(adapter);
    const result = await runner.run(context);
    const durationMs = Date.now() - startedAt;

    if (result.ok) {
      // Sprint A: Save Structured Artifact to Blackboard
      await BlackboardService.saveArtifact({ 
        projectId: context.projectId, 
        chainId: context.chainId, 
        runId: context.runId 
      }, {
        runId: context.runId,
        stageId: context.pipeline.currentStageId,
        roleSlug: context.agent.slug,
        timestamp: new Date().toISOString(),
        summary: result.content.slice(0, 1000), // Primary textual output
        findings: result.findings,
        decisions: result.decisions,
        // If the status is handoff, we normally set this in the result
        handoff: result.responseMode === 'handoff' ? {
          nextRole: 'unknown', // Will be refined by the router/graph
          rationale: 'Stage completed, transitioning.'
        } : undefined
      });

      // Telemetry
      await this.emitTelemetry(context, result, durationMs);
    } else {
      throw new Error(`Execution failed: ${result.error}`);
    }

    return result;
  }

  private async emitTelemetry(context: RunContext, result: ExecutionResult, durationMs: number) {
    if (!context.agent.skills || context.agent.skills.length === 0) return;

    const inputTokens = result.usage?.inputTokens || 0;
    const outputTokens = result.usage?.outputTokens || 0;
    const totalTokens = result.usage?.totalTokens || 0;

    await Promise.all(
      context.agent.skills.map((skillId) => {
        const skill = SkillRegistry.getSkill(skillId);
        if (!skill) return Promise.resolve();
        
        return appendSkillUsage({
          timestamp: new Date().toISOString(),
          runId: context.runId,
          ticketId: context.activeTicketId || 'none',
          threadId: context.runId,
          roleSlug: context.agent.slug,
          pipelineId: context.pipeline.id,
          stage: context.pipeline.currentStageId,
          skillId,
          sourcePath: skill.sourcePath,
          durationMs,
          inputTokens,
          outputTokens,
          totalTokens,
          outcome: 'success',
        });
      }),
    );
  }
}
