import express from 'express';
import { loadConfig } from './config';
import {
  AgentRegistry,
  DynamicDiscoveryService,
  executeRuntimeRun,
  ServiceLifecycleEventBus,
  ServiceExecutionAdapterRegistry,
  LocalProcessAdapter,
  DockerAdapter,
} from '@system/runtime';
import { emitEvent } from '@system/events';

const config = loadConfig();
const { port: PORT, host: HOST, planeId: PLANE_ID } = config;

const app = express();
app.use(express.json());

// Initialize Core Runtime Plane Orchestration
const eventBus = new ServiceLifecycleEventBus();
const adapterRegistry = new ServiceExecutionAdapterRegistry();
adapterRegistry.register(new LocalProcessAdapter());
adapterRegistry.register(new DockerAdapter());

// Standalone Runtime Plane Entrypoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    planeId: PLANE_ID,
    engine: 'WorkerExecutionEngine',
    version: '1.0.0',
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    planeId: PLANE_ID,
    checks: {
      adaptersRegistered: true,
      eventBusReady: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/runtime/status', async (req, res) => {
  const workspacePath = typeof req.query.workspacePath === 'string' ? req.query.workspacePath : undefined;
  if (AgentRegistry.getAllAgents().length === 0) {
    await DynamicDiscoveryService.discoverAll(workspacePath).catch(() => undefined);
  }
  res.json({
    status: 'online',
    planeId: PLANE_ID,
    engine: 'WorkerExecutionEngine',
    adapters: ['local-process', 'docker'],
    registeredAgents: AgentRegistry.getAllAgents().length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trigger an execution run directly on this runtime plane.
 * Supports both synchronous graph execution (mode === 'sync' with ticketId)
 * and asynchronous worker dispatch for Control Plane orchestration.
 */
app.post('/api/runtime/execute', async (req, res) => {
  const { runId, projectId, chainId, agentId, input, mode, ticketId, workspacePath, pipelineId } = req.body || {};

  if (!runId || !agentId) {
    return res.status(400).json({ error: 'Missing runId or agentId' });
  }

  try {
    if (AgentRegistry.getAllAgents().length === 0) {
      await DynamicDiscoveryService.discoverAll(workspacePath).catch(() => undefined);
    }

    const resolvedAgent = AgentRegistry.getAgent(agentId);
    console.log(`[${PLANE_ID}] Starting execution for run: ${runId} (agent=${agentId})`);

    await emitEvent({
      runId,
      projectId: projectId || 'none',
      chainId: chainId || 'none',
      type: 'runtime.plane.dispatch',
      actor: { type: 'system', id: PLANE_ID },
      payload: { agentId, status: 'dispatched', agentRegistered: Boolean(resolvedAgent) },
    }).catch(() => undefined);

    if (mode === 'sync' && ticketId) {
      const userContent =
        typeof input === 'string'
          ? input
          : typeof input?.message === 'string'
            ? input.message
            : JSON.stringify(input || {});

      const result = await executeRuntimeRun({
        runId,
        ticketId,
        threadId: chainId || `thread-${runId}`,
        projectId: projectId || 'agent_system',
        workspacePath: workspacePath || process.cwd(),
        selected_pipeline: pipelineId || 'unified-task-intake',
        customAgents: [agentId],
        messages: [{ role: 'user', content: userContent }],
      });

      return res.json({
        status: 'completed',
        runId,
        planeId: PLANE_ID,
        result,
      });
    }

    eventBus.emit('service.started', `run:${runId}`, `dispatched_to_${agentId}`, {
      source: PLANE_ID,
      actorId: agentId,
    });

    return res.json({
      status: 'dispatched',
      runId,
      planeId: PLANE_ID,
      agentId,
      agentRegistered: Boolean(resolvedAgent),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[${PLANE_ID}] Execution trigger failed:`, error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`
  🚀 Runtime Plane Standalone Service Active
  -----------------------------------------
  ID      : ${PLANE_ID}
  URL     : http://${HOST}:${PORT}
  HEALTH  : http://${HOST}:${PORT}/health
  ENGINE  : WorkerExecutionEngine
  -----------------------------------------
  `);
});
