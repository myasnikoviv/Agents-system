import fs from 'fs';
import path from 'path';
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
import { logGovernance } from './governance/GovernanceLogger';
import { applyPerformanceAwarePolicy, ModelRouteDecision } from './adaptive/AdaptiveIntelligenceEngine';

type RuntimeBackend = 'claude-cli' | 'codex-cli' | 'openhands-sdk' | 'gemini' | 'langchain';

interface ProviderPolicy {
  backupOrder?: RuntimeBackend[];
}

export class AgentExecutor {
  constructor() {}

  private resolveBackendFromContext(
    context: RunContext,
    primary: 'claude-cli' | 'codex-cli' | 'openhands-sdk',
  ): 'claude-cli' | 'codex-cli' | 'openhands-sdk' {
    if (context.executionTarget === 'claude-cli') return 'claude-cli';
    if (context.executionTarget === 'codex-cli') return 'codex-cli';
    if (context.executionTarget === 'openhands') return 'openhands-sdk';
    return primary;
  }

  private loadProviderPolicy(workspacePath: string): ProviderPolicy {
    const filePath = path.resolve(workspacePath || process.cwd(), 'docs/runtime/adaptive/provider-backup-policy.json');
    if (!fs.existsSync(filePath)) {
      return { backupOrder: ['codex-cli', 'claude-cli', 'openhands-sdk', 'gemini', 'langchain'] };
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProviderPolicy;
    } catch {
      return { backupOrder: ['codex-cli', 'claude-cli', 'openhands-sdk', 'gemini', 'langchain'] };
    }
  }

  private resolveExecutionChain(context: RunContext): RuntimeBackend[] {
    const cfg = loadConfig(context.workspacePath);
    const preferred = this.resolveBackendFromContext(context, cfg.backend);
    const policy = this.loadProviderPolicy(context.workspacePath || process.cwd());
    const chain = [preferred as RuntimeBackend, ...(policy.backupOrder || [])];
    return Array.from(new Set(chain));
  }

  private createAdapter(backend: RuntimeBackend, modelOverride?: string): ExecutionAdapter | null {
    if (backend === 'claude-cli') return new ClaudeCliAdapter();
    if (backend === 'codex-cli') return new CodexCliAdapter();
    if (backend === 'openhands-sdk') return new OpenHandsAdapter();
    if (backend === 'gemini') {
      if (!process.env.GOOGLE_API_KEY) return null;
      return new GeminiAdapter(process.env.GOOGLE_API_KEY, modelOverride || process.env.GOOGLE_MODEL || 'gemini-1.5-flash');
    }
    if (backend === 'langchain') {
      if (!process.env.OPENAI_API_KEY) return null;
      return new LangChainAdapter(process.env.OPENAI_API_KEY);
    }
    return null;
  }

  private applyBackendContext(context: RunContext, backend: RuntimeBackend): void {
    const cfg = loadConfig(context.workspacePath);
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
    } else if (backend === 'gemini') {
      context.executionTarget = 'direct';
      context.provider = 'google-gemini';
      context.model = process.env.GOOGLE_MODEL || 'gemini-1.5-flash';
    } else {
      context.executionTarget = 'direct';
      context.provider = 'openai';
      context.model = process.env.OPENAI_MODEL || 'gpt-4o';
    }
  }

  async run(context: RunContext, providedAdapter?: ExecutionAdapter): Promise<ExecutionResult> {
    // AGSYS-3525: Adaptive Model Switching
    const workspacePath = context.workspacePath || process.cwd();
    const initialDecision: ModelRouteDecision = {
      runId: context.runId,
      projectId: context.projectId,
      taskType: 'general',
      modelTier: (process.env.RUNTIME_MODEL_TIER as any) || 'medium',
      model: context.model || process.env.RUNTIME_MODEL_NAME || 'gpt-4o',
      reason: 'initial_request'
    };

    const adaptiveDecision = await applyPerformanceAwarePolicy({
      workspacePath,
      projectId: context.projectId,
      assetId: context.agent.slug,
      decision: initialDecision,
      mode: process.env.RUNTIME_ROUTING_POLICY_MODE as any
    });

    if (adaptiveDecision.modelTier !== initialDecision.modelTier) {
      console.log(`[AgentExecutor] Adaptive Model Switch: ${context.agent.slug} -> ${adaptiveDecision.modelTier} (${adaptiveDecision.reason})`);
      context.model = adaptiveDecision.model;
    }

    const chain = providedAdapter ? [] : this.resolveExecutionChain(context);
    const failures: string[] = [];
    let result: ExecutionResult | null = null;
    let durationMs = 0;

    if (providedAdapter) {
      const startedAt = Date.now();
      const runner = new NativeToolLoopRunner(providedAdapter);
      result = await runner.run(context);
      durationMs = Date.now() - startedAt;
    } else {
      for (let i = 0; i < chain.length; i += 1) {
        const backend = chain[i];
        const adapter = this.createAdapter(backend, context.model);
        if (!adapter) {
          failures.push(`${backend}:adapter_unavailable`);
          continue;
        }
        this.applyBackendContext(context, backend);
        const startedAt = Date.now();
        const runner = new NativeToolLoopRunner(adapter);
        const attempt = await runner.run(context);
        durationMs = Date.now() - startedAt;
        if (attempt.ok) {
          result = attempt;
          if (i > 0) {
            logGovernance({
              rule: 'provider_backup_orchestration',
              status: 'pass',
              action: 'allow',
              ticket: context.activeTicketId,
              runId: context.runId,
              chainId: context.chainId,
              detail: `selected=${backend};attempt=${i + 1};failures=${failures.join('|') || 'none'}`,
            });
          }
          break;
        }
        failures.push(`${backend}:${attempt.error || 'failed'}`);
        logGovernance({
          rule: 'provider_backup_orchestration',
          status: 'fail',
          action: 'warn',
          ticket: context.activeTicketId,
          runId: context.runId,
          chainId: context.chainId,
          detail: `backend=${backend};attempt=${i + 1};error=${attempt.error || 'failed'}`,
        });
      }
    }

    if (result?.ok) {
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

      // Sprint 5.5 — Governance Soft Gates
      const ticketId = context.activeTicketId || 'AGSYS-UNKNOWN';
      const { logParticipationGate } = await import('./governance/AgentParticipationEnforcer');
      logParticipationGate({
        agentSlug: context.agent.slug,
        ticketId,
        runId: context.runId,
        chainId: context.chainId,
        content: result.content
      });

      const { logCostTrackerGate } = await import('./governance/CostTrackerEnforcer');
      logCostTrackerGate({
        ticketId,
        runId: context.runId,
        chainId: context.chainId,
        agentSlug: context.agent.slug,
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      });

      // Telemetry
      await this.emitTelemetry(context, result, durationMs);

      // AGSYS-3522: Emit Telemetry Signals to Redis Collector
      try {
        const { signalCollector } = require('./adaptive/SignalCollector');
        signalCollector.emit({
          type: 'latency',
          assetId: context.agent.slug,
          projectId: context.projectId,
          value: durationMs,
          metadata: { runId: context.runId, stageId: context.pipeline.currentStageId }
        });

        if (result.usage) {
          signalCollector.emit({
            type: 'token_usage',
            assetId: context.agent.slug,
            projectId: context.projectId,
            value: result.usage.totalTokens,
            metadata: { runId: context.runId, input: result.usage.inputTokens, output: result.usage.outputTokens }
          });
        }
      } catch (e) {
        // Non-blocking telemetry failure
      }
    } else {
      throw new Error(`Execution failed across backup chain: ${failures.join(' | ') || result?.error || 'unknown'}`);
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
