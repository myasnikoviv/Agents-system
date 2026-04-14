import path from 'path';
import { RunContext } from './context/RunContext';
import { ToolExecutor } from './ToolExecutor';
import {
  acquireToolLease,
  releaseToolLease,
  upsertWorkbenchTool,
  type WorkbenchToolMode,
} from './AgentWorkbenchScheduler';
import {
  resolveWorkbenchToolPolicy,
} from './WorkbenchToolRegistry';
import { appendWorkbenchTelemetry } from './WorkbenchTelemetryCollector';
import { logGovernance } from './governance/GovernanceLogger';
import {
  buildToolCacheKey,
  getToolResultFromCache,
  isDeterministicToolCacheable,
  setToolResultToCache,
} from './optimization/ToolResultCache';

export interface WorkbenchExecutionResult {
  status: 'success' | 'failed' | 'queued' | 'blocked';
  content: any;
  summary: string;
  queuePosition?: number;
  error?: string;
}

function toSchedulerMode(mode: 'parallel' | 'exclusive' | 'isolated'): WorkbenchToolMode {
  if (mode === 'parallel') return 'share-safe';
  if (mode === 'isolated') return 'isolated';
  return 'exclusive';
}

function summarize(content: unknown, defaultValue: string): string {
  if (typeof content === 'string') return content.length > 200 ? `${content.slice(0, 199)}…` : content;
  try {
    const serialized = JSON.stringify(content);
    return serialized.length > 200 ? `${serialized.slice(0, 199)}…` : serialized;
  } catch {
    return defaultValue;
  }
}

function resolveLeaseScopeKey(context: RunContext, level: 'global' | 'tenant' | 'workspace' | 'session'): string {
  if (level === 'global') return 'global';
  if (level === 'tenant') return `tenant:${context.tenantId || 'tenant:default'}`;
  if (level === 'workspace') {
    return `tenant:${context.tenantId || 'tenant:default'}:workspace:${context.workspaceId || 'workspace:default'}`;
  }
  return `tenant:${context.tenantId || 'tenant:default'}:workspace:${context.workspaceId || 'workspace:default'}:session:${context.chainId || context.runId}`;
}

export async function executeViaWorkbench(
  toolId: string,
  args: any,
  context: RunContext,
): Promise<WorkbenchExecutionResult> {
  const agentId = context.agent.slug || 'unknown-agent';
  const executionStartedAt = Date.now();
  const policy = resolveWorkbenchToolPolicy(toolId, {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    sessionId: context.chainId,
  });

  appendWorkbenchTelemetry({
    runId: context.runId,
    projectId: context.projectId,
    agentId,
    toolId,
    action: 'request',
    status: 'success',
  });

  if (!policy) {
    logGovernance({
      rule: 'workbench_registry',
      status: 'fail',
      action: 'block',
      ticket: context.activeTicketId,
      runId: context.runId,
      chainId: context.chainId,
      detail: `tool_not_registered:${toolId}`,
    });
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'blocked',
      status: 'failed',
      detail: 'tool_not_registered',
    });
    return { status: 'blocked', content: null, summary: `Tool ${toolId} is not registered in Workbench.` };
  }

  const allowed = policy.allowedAgents.includes('*') || policy.allowedAgents.includes(agentId);
  if (!allowed) {
    logGovernance({
      rule: 'workbench_access_control',
      status: 'fail',
      action: 'block',
      ticket: context.activeTicketId,
      runId: context.runId,
      chainId: context.chainId,
      detail: `unauthorized_tool_usage:${agentId}:${toolId}`,
    });
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'blocked',
      status: 'failed',
      detail: 'unauthorized_agent',
    });
    return { status: 'blocked', content: null, summary: `Agent ${agentId} is not allowed to use ${toolId}.` };
  }

  const risk = policy.risk || 'safe';
  if (risk === 'unsafe' && policy.type !== 'isolated') {
    logGovernance({
      rule: 'workbench_scope_policy',
      status: 'fail',
      action: 'block',
      ticket: context.activeTicketId,
      runId: context.runId,
      chainId: context.chainId,
      detail: `unsafe_requires_isolated:${toolId}:${policy.type}`,
    });
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'blocked',
      status: 'failed',
      detail: 'unsafe_requires_isolated',
    });
    return { status: 'blocked', content: null, summary: `Tool ${toolId} policy violation: unsafe tool must be isolated.` };
  }
  if (risk === 'mutable' && policy.type === 'parallel') {
    logGovernance({
      rule: 'workbench_scope_policy',
      status: 'fail',
      action: 'block',
      ticket: context.activeTicketId,
      runId: context.runId,
      chainId: context.chainId,
      detail: `mutable_parallel_forbidden:${toolId}`,
    });
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'blocked',
      status: 'failed',
      detail: 'mutable_parallel_forbidden',
    });
    return { status: 'blocked', content: null, summary: `Tool ${toolId} policy violation: mutable tool cannot be parallel.` };
  }

  upsertWorkbenchTool({
    id: policy.id,
    mode: toSchedulerMode(policy.type),
    description: `Workbench policy tool ${policy.id}`,
  });

  const scopeLevel = policy.scope?.level || 'global';
  const leaseScopeKey = resolveLeaseScopeKey(context, scopeLevel);
  const lease = acquireToolLease(toolId, agentId, leaseScopeKey);
  if (lease.status === 'queued') {
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'queued',
      status: 'failed',
      detail: `queue_position=${lease.queuePosition || 0}`,
    });
    logGovernance({
      rule: 'workbench_queue',
      status: 'skip',
      action: 'warn',
      ticket: context.activeTicketId,
      runId: context.runId,
      chainId: context.chainId,
      detail: `tool_queued:${toolId}:position=${lease.queuePosition || 0}`,
    });
    return {
      status: 'queued',
      content: null,
      summary: `Tool ${toolId} is busy. Queued at position ${lease.queuePosition || 0}.`,
      queuePosition: lease.queuePosition,
    };
  }

  if (lease.status === 'not_found') {
    return { status: 'blocked', content: null, summary: lease.reason || 'Tool unavailable.' };
  }

  appendWorkbenchTelemetry({
    runId: context.runId,
    projectId: context.projectId,
    agentId,
    toolId,
    action: 'acquired',
    status: 'success',
    detail: lease.status,
  });

  const isolatedWorkspacePath =
    policy.type === 'isolated'
      ? path.join(
        context.workspacePath,
        '.workbench',
        'isolated',
        scopeLevel,
        context.tenantId || 'tenant:default',
        context.workspaceId || 'workspace:default',
        context.chainId || context.runId,
        agentId,
        toolId,
      )
      : undefined;

  try {
    const cacheable = isDeterministicToolCacheable({
      workspacePath: context.workspacePath,
      toolId,
      policy,
    });
    const toolCacheKey = cacheable
      ? buildToolCacheKey({
          toolId,
          args,
          tenantId: context.tenantId,
          workspaceId: context.workspaceId,
          scopeLevel,
        })
      : '';
    if (cacheable) {
      const cached = getToolResultFromCache({
        workspacePath: context.workspacePath,
        key: toolCacheKey,
      });
      if (cached.hit) {
        appendWorkbenchTelemetry({
          runId: context.runId,
          projectId: context.projectId,
          agentId,
          toolId,
          action: 'executed',
          status: 'success',
          startedAt: new Date(executionStartedAt).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - executionStartedAt,
        });
        return {
          status: 'success',
          content: cached.content,
          summary: summarize(cached.content, `Tool ${toolId} cache hit.`),
        };
      }
    }
    const content = await ToolExecutor.execute(toolId, args, context, {
      viaWorkbench: true,
      isolatedWorkspacePath,
    });
    if (cacheable) {
      setToolResultToCache({
        workspacePath: context.workspacePath,
        key: toolCacheKey,
        content,
      });
    }
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'executed',
      status: 'success',
      startedAt: new Date(executionStartedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - executionStartedAt,
    });
    return {
      status: 'success',
      content,
      summary: summarize(content, `Tool ${toolId} executed.`),
    };
  } catch (err: any) {
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'failed',
      status: 'failed',
      startedAt: new Date(executionStartedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - executionStartedAt,
      detail: String(err?.message || err),
    });
    return {
      status: 'failed',
      content: null,
      error: String(err?.message || err),
      summary: `Tool ${toolId} failed: ${String(err?.message || err)}`,
    };
  } finally {
    releaseToolLease(toolId, agentId, leaseScopeKey);
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'released',
      status: 'success',
      startedAt: new Date(executionStartedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - executionStartedAt,
    });
  }
}
