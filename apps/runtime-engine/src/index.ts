import express from 'express';
import { loadConfig } from './config';
import { 
  WorkerExecutionEngine, 
  ServiceLifecycleEventBus,
  ServiceExecutionAdapterRegistry,
  LocalProcessAdapter,
  DockerAdapter
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

// WorkerExecutionEngine is a static class, no instance needed for now.

// Standalone Runtime Plane Entrypoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    planeId: PLANE_ID,
    engine: 'WorkerExecutionEngine',
    version: '1.0.0'
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

/**
 * Trigger an execution run directly on this plane.
 * In the final topology, this might be called by the Control Plane
 * or triggered via a Message Queue.
 */
app.post('/api/runtime/execute', async (req, res) => {
  const { runId, projectId, chainId, agentId, input } = req.body;

  if (!runId || !agentId) {
    return res.status(400).json({ error: 'Missing runId or agentId' });
  }

  try {
    console.log(`[${PLANE_ID}] Starting execution for run: ${runId}`);
    
    // Emit initialization event via the shared events package
    emitEvent({
      runId,
      projectId: projectId || 'none',
      chainId: chainId || 'none',
      type: 'runtime.plane.dispatch',
      actor: { type: 'system', id: PLANE_ID },
      payload: { agentId, status: 'dispatched' }
    });

    // For now, this is a skeleton trigger. 
    // Real logic would involve loading the agent definition and calling executionEngine.
    res.json({ status: 'dispatched', runId, planeId: PLANE_ID });

  } catch (error: any) {
    console.error(`[${PLANE_ID}] Execution trigger failed:`, error);
    res.status(500).json({ error: error.message });
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
  
  // Register with dynamic discovery if configured
  // DynamicDiscoveryService.announce(PLANE_ID, `http://${HOST}:${PORT}`);
});
