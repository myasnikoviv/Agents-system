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
  getWorkbenchToolPolicy,
  isAgentAllowedForTool,
} from './WorkbenchToolRegistry';
import { appendWorkbenchTelemetry } from './WorkbenchTelemetryCollector';
import { logGovernance } from './governance/GovernanceLogger';

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

function summarize(content: unknown, fallback: string): string {
  if (typeof content === 'string') return content.length > 200 ? `${content.slice(0, 199)}…` : content;
  try {
    const serialized = JSON.stringify(content);
    return serialized.length > 200 ? `${serialized.slice(0, 199)}…` : serialized;
  } catch {
    return fallback;
  }
}

export async function executeViaWorkbench(
  toolId: string,
  args: any,
  context: RunContext,
): Promise<WorkbenchExecutionResult> {
  const agentId = context.agent.slug || 'unknown-agent';
  const policy = getWorkbenchToolPolicy(toolId);

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

  if (!isAgentAllowedForTool(toolId, agentId)) {
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

  upsertWorkbenchTool({
    id: policy.id,
    mode: toSchedulerMode(policy.type),
    description: `Workbench policy tool ${policy.id}`,
  });

  const lease = acquireToolLease(toolId, agentId);
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
      ? path.join(context.workspacePath, '.workbench', 'isolated', context.runId, agentId, toolId)
      : undefined;

  try {
    const content = await ToolExecutor.execute(toolId, args, context, {
      viaWorkbench: true,
      isolatedWorkspacePath,
    });
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'executed',
      status: 'success',
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
      detail: String(err?.message || err),
    });
    return {
      status: 'failed',
      content: null,
      error: String(err?.message || err),
      summary: `Tool ${toolId} failed: ${String(err?.message || err)}`,
    };
  } finally {
    releaseToolLease(toolId, agentId);
    appendWorkbenchTelemetry({
      runId: context.runId,
      projectId: context.projectId,
      agentId,
      toolId,
      action: 'released',
      status: 'success',
    });
  }
}
