import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { executeUnifiedSwarmRun, type PilotState } from './UnifiedSwarmGraph';

function dedupeAgents(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const slug = String(raw || '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export async function executeMultipleAgentsRun(initialState: Partial<PilotState>): Promise<any> {
  const runId = String(initialState.runId || `run-${Date.now()}`);
  const projectId = String(initialState.projectId || 'agent_system');
  const chainId = String(initialState.threadId || `thread-${Date.now()}`);
  const candidates = dedupeAgents(Array.isArray(initialState.customAgents) ? initialState.customAgents : []);
  const bootstrapAgents = candidates.slice(0, 2);

  if (bootstrapAgents.length >= 2) {
    const emitSystemThought = async () => {
      const { emitEvent } = await import('../events/EventBus');
      await emitEvent({
        type: 'system.thought',
        runId,
        projectId,
        chainId,
        actor: { type: 'system', id: 'multiple-agents-runtime' },
        payload: {
          message: `Distributed bootstrap: ${bootstrapAgents.join(', ')}`,
        },
      });
    };
    await emitSystemThought().catch(() => undefined);

    await Promise.all(
      bootstrapAgents.map((agentSlug) =>
        DynamicWorkerSpawnManager.ensureWorker(
          { runId, projectId, chainId, agentSlug },
          { emitEvents: true },
        ),
      ),
    );
  }

  return executeUnifiedSwarmRun(initialState);
}
