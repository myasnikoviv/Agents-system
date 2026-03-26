import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const PORT = Number(process.env.AGENT_SYSTEM_BACKEND_PORT || process.env.PORT || '3001');
const HOST = process.env.AGENT_SYSTEM_BACKEND_HOST || '127.0.0.1';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

process.on('uncaughtException', (error) => {
  console.error('[agent-system-backend] uncaughtException:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[agent-system-backend] unhandledRejection:', reason);
});

const settingsStore = new Map<string, unknown>();
const projectStore = new Map<string, { id: string; label: string }>();
const threadStore = new Map<string, Array<{ id: string; label: string; updatedAt: string }>>();
const planeBindingStore = new Map<string, {
  cockpitProjectId: string;
  planeProjectId?: string;
  planeProjectIdentifier?: string;
  planeProjectName?: string;
  status: 'linked' | 'missing-permission' | 'missing-config' | 'error' | 'pending';
  message?: string;
  checkedAt: string;
}>();

let runtimeSelection = {
  provider: 'codex-cli',
  model: 'gpt-5.4',
};

const providerModelCatalog: Record<'claude-cli' | 'codex-cli' | 'openhands-sdk', string[]> = {
  'claude-cli': [
    'auto',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-5-20251101',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
  ],
  'codex-cli': [
    'auto',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-5.4-pro',
    'gpt-5.3-codex',
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5',
    'o4-mini',
    'o3',
    'o3-mini',
    'o1',
    'o1-pro',
  ],
  'openhands-sdk': [
    'anthropic/claude-sonnet-4-6',
    'anthropic/claude-opus-4-6',
    'anthropic/claude-haiku-4-5-20251001',
    'anthropic/claude-sonnet-4-5-20250929',
    'anthropic/claude-opus-4-5-20251101',
    'anthropic/claude-opus-4-20250514',
    'anthropic/claude-sonnet-4-20250514',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4.1',
    'openai/gpt-4.1-mini',
    'openai/gpt-4.1-nano',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5.4',
    'openai/gpt-5.4-mini',
    'openai/o4-mini',
    'openai/o3',
    'openai/o3-mini',
    'openai/o1',
    'google/gemini-3.1-pro-preview',
    'google/gemini-3-flash-preview',
    'google/gemini-3.1-flash-lite-preview',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
  ],
};

type RuntimeProvider = keyof typeof providerModelCatalog;

const isRuntimeProvider = (value: string): value is RuntimeProvider => value in providerModelCatalog;

const getRuntimeSelectionFromExecutorSettings = (): { provider: RuntimeProvider; model: string } | null => {
  const raw = settingsStore.get('executor');
  if (!raw || typeof raw !== 'object') return null;
  const executor = raw as {
    backend?: string;
    claude?: { model?: string };
    codex?: { model?: string };
    openhands?: { model?: string };
  };
  if (!executor.backend || !isRuntimeProvider(executor.backend)) return null;
  const provider = executor.backend;
  const modelFromSettings =
    provider === 'claude-cli'
      ? executor.claude?.model
      : provider === 'codex-cli'
        ? executor.codex?.model
        : executor.openhands?.model;
  return {
    provider,
    model: modelFromSettings || providerModelCatalog[provider][0],
  };
};

let runtimeFooter = {
  executionTarget: 'local' as 'local' | 'remote',
  accessPolicy: 'full-access' as 'full-access' | 'sandbox',
  activeBranch: process.env.GIT_BRANCH || 'main',
  worktreePath: process.cwd(),
  preflightToken: null as string | null,
};

const defaultContractRegistry = {
  version: 'agent-system-1.0',
  catalog: [],
  types: [],
};

const PLANE_BASE_URL = (process.env.PLANE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const PLANE_WORKSPACE = process.env.PLANE_WORKSPACE || 'agent-system';
const PLANE_API_KEY = process.env.PLANE_API_KEY || process.env.PLANE_API_TOKEN || '';

const toPlaneIdentifier = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 12) || 'AGENT_SYS';

const toPlaneProjectName = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || 'Agent System Project';

const normalizeProjectKey = (value: string): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const canUsePlane = (): boolean => Boolean(PLANE_API_KEY && PLANE_BASE_URL && PLANE_WORKSPACE);

const syncPlaneBindingForProject = async (project: { id: string; label: string }) => {
  const checkedAt = new Date().toISOString();
  if (project.id === '__unbound__') {
    planeBindingStore.set(project.id, {
      cockpitProjectId: project.id,
      status: 'pending',
      message: 'Unbound chain is not linked to Plane by design',
      checkedAt,
    });
    return;
  }

  if (!canUsePlane()) {
    planeBindingStore.set(project.id, {
      cockpitProjectId: project.id,
      status: 'missing-config',
      message: 'PLANE_API_TOKEN / PLANE_BASE_URL / PLANE_WORKSPACE is not fully configured',
      checkedAt,
    });
    return;
  }

  const apiRoot = `${PLANE_BASE_URL}/api/v1/workspaces/${PLANE_WORKSPACE}`;
  const headers = { 'X-Api-Key': PLANE_API_KEY, 'Content-Type': 'application/json' };
  const wantedIdentifier = toPlaneIdentifier(project.id);
  const wantedName = toPlaneProjectName(project.label || project.id);

  try {
    const listRes = await fetch(`${apiRoot}/projects/`, { headers });
    if (!listRes.ok) {
      planeBindingStore.set(project.id, {
        cockpitProjectId: project.id,
        status: 'error',
        message: `Plane list projects failed: HTTP ${listRes.status}`,
        checkedAt,
      });
      return;
    }
    const rawProjects = await listRes.json() as
      | Array<{ id: string; name: string; identifier: string }>
      | { results?: Array<{ id: string; name: string; identifier: string }> };
    const projects = Array.isArray(rawProjects) ? rawProjects : (rawProjects?.results || []);
    const wantedKey = normalizeProjectKey(wantedName);
    const projectKey = normalizeProjectKey(project.id);
    const existing = projects.find(
      (p) =>
        p.identifier?.toUpperCase() === wantedIdentifier ||
        normalizeProjectKey(p.name || '') === wantedKey ||
        normalizeProjectKey(p.name || '') === projectKey,
    );

    if (existing) {
      planeBindingStore.set(project.id, {
        cockpitProjectId: project.id,
        planeProjectId: existing.id,
        planeProjectIdentifier: existing.identifier,
        planeProjectName: existing.name,
        status: 'linked',
        checkedAt,
      });
      return;
    }

    const createRes = await fetch(`${apiRoot}/projects/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: wantedName, identifier: wantedIdentifier }),
    });

    if (!createRes.ok) {
      const raw = await createRes.text();
      if (createRes.status === 409) {
        const retryListRes = await fetch(`${apiRoot}/projects/`, { headers });
        if (retryListRes.ok) {
          const retryRawProjects = await retryListRes.json() as
            | Array<{ id: string; name: string; identifier: string }>
            | { results?: Array<{ id: string; name: string; identifier: string }> };
          const retryProjects = Array.isArray(retryRawProjects) ? retryRawProjects : (retryRawProjects?.results || []);
          const conflicted = retryProjects.find(
            (p) =>
              p.identifier?.toUpperCase() === wantedIdentifier ||
              normalizeProjectKey(p.name || '') === wantedKey ||
              normalizeProjectKey(p.name || '') === projectKey,
          );
          if (conflicted) {
            planeBindingStore.set(project.id, {
              cockpitProjectId: project.id,
              planeProjectId: conflicted.id,
              planeProjectIdentifier: conflicted.identifier,
              planeProjectName: conflicted.name,
              status: 'linked',
              checkedAt,
              message: 'Linked existing project after 409 conflict',
            });
            return;
          }
        }
      }
      const permissionDenied = createRes.status === 401 || createRes.status === 403;
      planeBindingStore.set(project.id, {
        cockpitProjectId: project.id,
        status: permissionDenied ? 'missing-permission' : 'error',
        message: permissionDenied
          ? `Token cannot create Plane projects (HTTP ${createRes.status})`
          : `Plane create project failed: HTTP ${createRes.status} ${raw.slice(0, 200)}`,
        checkedAt,
      });
      return;
    }

    const created = (await createRes.json()) as { id: string; name: string; identifier: string };
    planeBindingStore.set(project.id, {
      cockpitProjectId: project.id,
      planeProjectId: created.id,
      planeProjectIdentifier: created.identifier,
      planeProjectName: created.name,
      status: 'linked',
      checkedAt,
    });
  } catch (error: any) {
    planeBindingStore.set(project.id, {
      cockpitProjectId: project.id,
      status: 'error',
      message: `Plane sync error: ${error?.message || 'unknown'}`,
      checkedAt,
    });
  }
};

const ensureProject = (id: string, label: string) => {
  const existing = projectStore.get(id);
  if (!existing) {
    projectStore.set(id, { id, label });
    threadStore.set(id, []);
    return;
  }
  existing.label = label;
  projectStore.set(id, existing);
};

ensureProject('default', 'Default');
void syncPlaneBindingForProject({ id: 'default', label: 'Default' });

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'agent-system-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/contracts/block_catalog', (_req, res) => {
  res.json({
    success: true,
    version: defaultContractRegistry.version,
    catalog: defaultContractRegistry.catalog,
  });
});

app.get('/api/contracts/context_types', (_req, res) => {
  res.json({
    success: true,
    version: defaultContractRegistry.version,
    types: defaultContractRegistry.types,
  });
});

app.get('/api/cockpit/catalog', (_req, res) => {
  res.json({
    success: true,
    agents: [],
    pipelines: [],
    skills: [],
  });
});

app.get('/api/cockpit/providers', (_req, res) => {
  const runtimeFromSettings = getRuntimeSelectionFromExecutorSettings();
  if (runtimeFromSettings) {
    runtimeSelection = runtimeFromSettings;
  } else if (!isRuntimeProvider(runtimeSelection.provider)) {
    runtimeSelection = {
      provider: 'codex-cli',
      model: providerModelCatalog['codex-cli'][0],
    };
  }

  res.json({
    success: true,
    runtimeSelection,
    capabilities: {
      providers: Object.keys(providerModelCatalog),
      providerModels: providerModelCatalog,
      executionTargets: ['local'],
      accessPolicies: ['full-access', 'sandbox'],
    },
  });
});

app.get('/api/cockpit/chains', (_req, res) => {
  const projects = Array.from(projectStore.values());
  for (const project of projects) {
    if (!planeBindingStore.has(project.id)) {
      void syncPlaneBindingForProject(project);
    }
  }
  const threadsByProject = Array.from(threadStore.entries()).reduce<Record<string, Array<{ id: string; label: string; updatedAt: string }>>>(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {},
  );
  const planeBindings = Array.from(planeBindingStore.entries()).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
  res.json({ success: true, projects, threadsByProject, planeBindings });
});

app.post('/api/cockpit/chains', (req, res) => {
  const projectId = String(req.body?.projectId || '').trim();
  const label = String(req.body?.label || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'project_id_required' });
    return;
  }

  if (!projectStore.has(projectId)) {
    const derivedLabel = projectId === '__unbound__' ? 'Unbound' : projectId;
    ensureProject(projectId, derivedLabel);
  }
  const project = projectStore.get(projectId);
  if (project) {
    void syncPlaneBindingForProject(project);
  }

  const nextThread = {
    id: `thread_${Date.now()}`,
    label,
    updatedAt: new Date().toISOString(),
  };
  const current = threadStore.get(projectId) || [];
  threadStore.set(projectId, [nextThread, ...current]);

  const projects = Array.from(projectStore.values());
  const threadsByProject = Array.from(threadStore.entries()).reduce<Record<string, Array<{ id: string; label: string; updatedAt: string }>>>(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {},
  );
  const planeBindings = Array.from(planeBindingStore.entries()).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
  res.json({ success: true, projects, threadsByProject, thread: nextThread, planeBindings });
});

app.post('/api/cockpit/plane/sync', async (req, res) => {
  const projectId = String(req.body?.projectId || '').trim();
  if (!projectId || !projectStore.has(projectId)) {
    res.status(400).json({ success: false, error: 'project_not_found' });
    return;
  }
  await syncPlaneBindingForProject(projectStore.get(projectId)!);
  res.json({ success: true, binding: planeBindingStore.get(projectId) || null });
});

app.get('/api/cockpit/plane/bindings', (_req, res) => {
  const bindings = Array.from(planeBindingStore.values());
  res.json({ success: true, bindings });
});

app.get('/api/cockpit/runtime-footer', (_req, res) => {
  res.json({
    success: true,
    runtimeFooter,
  });
});

app.post('/api/cockpit/runtime-footer', (req, res) => {
  const patch = req.body || {};
  runtimeFooter = {
    ...runtimeFooter,
    ...patch,
  };
  res.json({ success: true, runtimeFooter });
});

app.get('/api/cockpit/work-scope', (_req, res) => {
  res.json({
    success: true,
    cycles: [],
    stories: [],
    tasks: [],
    items: [],
    selected: { cycleId: '', storyId: '' },
    statusSummary: { total: 0, done: 0, inProgress: 0, todo: 0 },
  });
});

app.get('/api/cockpit/analytics/skills', (_req, res) => {
  res.json({
    success: true,
    summary: {
      totalEvents: 0,
      bySkill: {},
      byRole: {},
      byPipeline: {},
      unusedSkills: [],
    },
  });
});

app.get('/api/cockpit/providers/openhands/health', (_req, res) => {
  res.json({ success: true, alive: false, error: 'OpenHands not configured for standalone mode' });
});

app.get('/api/cockpit/providers/cli/status', (_req, res) => {
  res.json({
    success: true,
    status: {
      codex: { loggedIn: false },
      claude: { loggedIn: false, needsLogin: true },
    },
  });
});

app.post('/api/cockpit/providers/cli/test', (req, res) => {
  const provider = String(req.body?.provider || 'unknown');
  res.json({
    success: false,
    error: `${provider} test is unavailable in standalone backend mode`,
    result: { stdout: '', stderr: 'not_implemented' },
  });
});

app.post('/api/cockpit/providers/cli/login', (_req, res) => {
  res.json({ success: false, error: 'CLI login is not implemented in standalone backend mode' });
});

app.post('/api/cockpit/providers/test-message', (_req, res) => {
  res.json({
    success: false,
    status: 'unavailable',
    message: 'LLM test endpoint is disabled in standalone backend mode',
  });
});

app.post('/api/cockpit/providers/select', (req, res) => {
  const requestedProvider = String(req.body?.provider || runtimeSelection.provider);
  const model = String(req.body?.model || runtimeSelection.model);
  const provider: RuntimeProvider = isRuntimeProvider(requestedProvider) ? requestedProvider : 'codex-cli';
  runtimeSelection = { provider, model };

  const raw = settingsStore.get('executor');
  if (raw && typeof raw === 'object') {
    const executor = raw as Record<string, any>;
    executor.backend = provider;
    if (provider === 'claude-cli') executor.claude = { ...(executor.claude || {}), model };
    if (provider === 'codex-cli') executor.codex = { ...(executor.codex || {}), model };
    if (provider === 'openhands-sdk') executor.openhands = { ...(executor.openhands || {}), model };
    settingsStore.set('executor', executor);
  }

  res.json({ success: true, runtimeSelection });
});

app.get('/api/cockpit/settings/:section', (req, res) => {
  const section = req.params.section;
  res.json({
    success: true,
    settings: settingsStore.get(section) || {},
  });
});

app.post('/api/cockpit/settings/:section', (req, res) => {
  const section = req.params.section;
  const settings = req.body || {};
  settingsStore.set(section, settings);
  res.json({ success: true, settings });
});

app.post('/api/chat', (req, res) => {
  const message = String(req.body?.message || req.body?.prompt || '').trim();
  res.json({
    success: true,
    status: 'mock',
    threadId: req.body?.threadId || `thread_${Date.now()}`,
    logs: [{ stage: 'backend', role: 'assistant', status: 'completed', message: 'Standalone backend response' }],
    response: message ? `Standalone backend active. Received: ${message}` : 'Standalone backend active.',
  });
});

app.post('/api/chat/approve', (_req, res) => {
  res.json({
    success: true,
    status: 'approved',
    logs: [{ stage: 'approval', role: 'assistant', status: 'completed', message: 'Approval acknowledged' }],
  });
});

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ event_type: 'runtime.idle', status: 'ok', timestamp: new Date().toISOString() })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(`: keep-alive ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

app.post('/api/cockpit/attachments/upload', (_req, res) => {
  res.json({ success: true, uploaded: [] });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[agent-system-backend] request error:', error);
  res.status(500).json({
    success: false,
    error: 'internal_server_error',
    message: error?.message || 'Unexpected backend error',
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'endpoint_not_found' });
});

app.listen(PORT, HOST, () => {
  console.log(`[agent-system-backend] listening on http://${HOST}:${PORT}`);
});
