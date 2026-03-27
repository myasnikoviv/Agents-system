import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { executeQuasiLinearRun } from '../runtime/graphs/PilotQuasiLinearGraph';
import { fetchRecentEvents } from '../runtime/events/EventBus';
import { updateCockpitExecutorConfig, getCockpitExecutorConfig } from '../runtime/CockpitExecutorConfig';
import { DynamicDiscoveryService, AgentRegistry, PipelineRegistry, SkillRegistry } from '../runtime/DynamicDiscoveryService';

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
const projectStore = new Map<string, { id: string; label: string; worktreePath?: string }>();
const threadStore = new Map<string, Array<{ id: string; label: string; updatedAt: string }>>();
type PersistedChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
};
const threadMessageStore = new Map<string, PersistedChatMessage[]>();
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
const SETTINGS_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-settings.json');
const RUNTIME_STORE_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-runtime-store.json');

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

const persistSettingsStore = () => {
  try {
    const data = Object.fromEntries(settingsStore.entries());
    fs.mkdirSync(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[agent-system-backend] failed to persist settings store:', error);
  }
};

const restoreSettingsStore = () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE_PATH)) return;
    const raw = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    Object.entries(parsed).forEach(([key, value]) => settingsStore.set(key, value));
  } catch (error) {
    console.error('[agent-system-backend] failed to restore settings store:', error);
  }
};

const persistRuntimeStore = () => {
  try {
    const projects = Array.from(projectStore.values());
    const threadsByProject = Array.from(threadStore.entries()).reduce<Record<string, Array<{ id: string; label: string; updatedAt: string }>>>(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {},
    );
    const messagesByThread = Array.from(threadMessageStore.entries()).reduce<Record<string, PersistedChatMessage[]>>(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {},
    );
    fs.mkdirSync(path.dirname(RUNTIME_STORE_FILE_PATH), { recursive: true });
    fs.writeFileSync(
      RUNTIME_STORE_FILE_PATH,
      JSON.stringify({ projects, threadsByProject, messagesByThread }, null, 2),
      'utf-8',
    );
  } catch (error) {
    console.error('[agent-system-backend] failed to persist runtime store:', error);
  }
};

const restoreRuntimeStore = () => {
  try {
    if (!fs.existsSync(RUNTIME_STORE_FILE_PATH)) return;
    const raw = fs.readFileSync(RUNTIME_STORE_FILE_PATH, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as {
      projects?: Array<{ id: string; label: string; worktreePath?: string }>;
      threadsByProject?: Record<string, Array<{ id: string; label: string; updatedAt: string }>>;
      messagesByThread?: Record<string, PersistedChatMessage[]>;
    };
    (parsed.projects || []).forEach((project) => {
      if (!project?.id) return;
      projectStore.set(project.id, {
        id: project.id,
        label: project.label || project.id,
        ...(project.worktreePath ? { worktreePath: project.worktreePath } : {}),
      });
    });
    Object.entries(parsed.threadsByProject || {}).forEach(([projectId, threads]) => {
      threadStore.set(projectId, Array.isArray(threads) ? threads : []);
    });
    Object.entries(parsed.messagesByThread || {}).forEach(([threadId, messages]) => {
      threadMessageStore.set(
        threadId,
        (Array.isArray(messages) ? messages : []).filter(
          (message) =>
            Boolean(message?.id) &&
            (message?.role === 'user' || message?.role === 'agent') &&
            typeof message?.content === 'string' &&
            typeof message?.timestamp === 'string',
        ),
      );
    });
  } catch (error) {
    console.error('[agent-system-backend] failed to restore runtime store:', error);
  }
};

const syncExecutorSettingsToRuntimeConfig = (executorSettings: Record<string, any>) => {
  try {
    const current = getCockpitExecutorConfig();
    const backend = String(executorSettings.backend || current.backend) as 'claude-cli' | 'codex-cli' | 'openhands-sdk';
    updateCockpitExecutorConfig({
      backend,
      claude: {
        ...current.claude,
        ...(executorSettings.claude || {}),
      },
      codex: {
        ...current.codex,
        ...(executorSettings.codex || {}),
      },
      openhands: {
        ...current.openhands,
        ...(executorSettings.openhands || {}),
        apiKeys: {
          ...current.openhands.apiKeys,
          ...(executorSettings.openhands?.apiKeys || {}),
        },
      },
    });
  } catch (error) {
    console.error('[agent-system-backend] failed to sync executor settings to cockpit_config.json:', error);
  }
};

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

const ensureProject = (id: string, label: string, worktreePath?: string) => {
  const existing = projectStore.get(id);
  if (!existing) {
    projectStore.set(id, { id, label, ...(worktreePath ? { worktreePath } : {}) });
    threadStore.set(id, []);
    persistRuntimeStore();
    return;
  }
  existing.label = label;
  if (worktreePath && worktreePath.trim()) {
    existing.worktreePath = worktreePath.trim();
  }
  projectStore.set(id, existing);
  persistRuntimeStore();
};

const ensureThreadInProject = (projectId: string, threadId: string, label?: string) => {
  if (!projectStore.has(projectId)) {
    ensureProject(projectId, projectId === '__unbound__' ? 'Unbound' : projectId);
  }
  const current = threadStore.get(projectId) || [];
  const idx = current.findIndex((t) => t.id === threadId);
  const now = new Date().toISOString();
  if (idx === -1) {
    current.unshift({
      id: threadId,
      label: label || `Chat ${new Date().toLocaleTimeString()}`,
      updatedAt: now,
    });
  } else {
    current[idx] = { ...current[idx], updatedAt: now };
  }
  threadStore.set(projectId, current);
  if (!threadMessageStore.has(threadId)) threadMessageStore.set(threadId, []);
  persistRuntimeStore();
};

const appendThreadMessage = (threadId: string, role: 'user' | 'agent', content: string) => {
  const payload = String(content || '').trim();
  if (!payload) return;
  const current = threadMessageStore.get(threadId) || [];
  current.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content: payload,
    timestamp: new Date().toISOString(),
  });
  // Keep history bounded
  threadMessageStore.set(threadId, current.slice(-500));
  persistRuntimeStore();
};

const refreshCatalog = async () => {
  try {
    await DynamicDiscoveryService.discoverAll(process.cwd());
  } catch (error) {
    console.error('[agent-system-backend] catalog discovery error:', error);
  }
};

restoreRuntimeStore();
if (projectStore.size === 0) {
  ensureProject('default', 'Default');
}
for (const project of projectStore.values()) {
  void syncPlaneBindingForProject(project);
}
restoreSettingsStore();
void refreshCatalog();
const runtimeFromSettingsAtBoot = getRuntimeSelectionFromExecutorSettings();
if (runtimeFromSettingsAtBoot) {
  runtimeSelection = runtimeFromSettingsAtBoot;
}

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

app.get('/api/cockpit/catalog', async (_req, res) => {
  await refreshCatalog();
  const agents = AgentRegistry.getAllAgents().map((agent) => agent.slug).sort();
  const pipelines = PipelineRegistry.getAllPipelines().map((pipeline) => pipeline.slug).sort();
  const skills = SkillRegistry.getAllSkills().map((skill) => skill.id).sort();
  res.json({
    success: true,
    agents,
    pipelines,
    skills,
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
  const projectLabel = String(req.body?.projectLabel || '').trim();
  const worktreePath = String(req.body?.worktreePath || '').trim();
  const label = String(req.body?.label || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'project_id_required' });
    return;
  }

  if (!projectStore.has(projectId)) {
    const derivedLabel = projectId === '__unbound__' ? 'Unbound' : (projectLabel || projectId);
    ensureProject(projectId, derivedLabel, worktreePath || undefined);
  } else if (projectLabel || worktreePath) {
    const existing = projectStore.get(projectId)!;
    ensureProject(projectId, projectLabel || existing.label, worktreePath || existing.worktreePath);
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
  if (!threadMessageStore.has(nextThread.id)) {
    threadMessageStore.set(nextThread.id, []);
  }
  persistRuntimeStore();

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

app.get('/api/cockpit/chains/:threadId/messages', (req, res) => {
  const threadId = String(req.params.threadId || '').trim();
  if (!threadId) {
    res.status(400).json({ success: false, error: 'thread_id_required' });
    return;
  }
  res.json({
    success: true,
    threadId,
    messages: threadMessageStore.get(threadId) || [],
  });
});

app.post('/api/cockpit/projects/select', (req, res) => {
  const projectId = String(req.body?.projectId || '').trim();
  if (!projectId) {
    res.status(400).json({ success: false, error: 'project_id_required' });
    return;
  }
  const project = projectStore.get(projectId);
  if (!project) {
    res.status(404).json({ success: false, error: 'project_not_found' });
    return;
  }

  if (project.worktreePath && project.worktreePath.trim()) {
    runtimeFooter = {
      ...runtimeFooter,
      worktreePath: project.worktreePath.trim(),
    };
  }

  res.json({ success: true, project, runtimeFooter });
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
  const raw = settingsStore.get('executor');
  const executor = (raw && typeof raw === 'object') ? raw as { openhands?: { serverUrl?: string } } : {};
  const configuredUrl = String(executor.openhands?.serverUrl || '').trim();
  const serverUrl = (configuredUrl || process.env.OPENHANDS_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  fetch(`${serverUrl}/health`)
    .then(async (response) => {
      if (!response.ok) {
        res.json({ success: true, alive: false, error: `HTTP ${response.status}`, serverUrl });
        return;
      }
      const data = await response.json().catch(() => ({}));
      res.json({ success: true, alive: true, serverUrl, details: data });
    })
    .catch((error) => {
      res.json({ success: true, alive: false, error: error?.message || 'unreachable', serverUrl });
    });
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
  const executor = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  executor.backend = provider;
  if (provider === 'claude-cli') executor.claude = { ...(executor.claude || {}), model };
  if (provider === 'codex-cli') executor.codex = { ...(executor.codex || {}), model };
  if (provider === 'openhands-sdk') executor.openhands = { ...(executor.openhands || {}), model };
  settingsStore.set('executor', executor);
  persistSettingsStore();
  syncExecutorSettingsToRuntimeConfig(executor);

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
  persistSettingsStore();

  if (section === 'executor') {
    const runtimeFromSettings = getRuntimeSelectionFromExecutorSettings();
    if (runtimeFromSettings) {
      runtimeSelection = runtimeFromSettings;
    }
    if (settings && typeof settings === 'object') {
      syncExecutorSettingsToRuntimeConfig(settings as Record<string, any>);
    }
  }

  res.json({ success: true, settings });
});

app.post('/api/chat', async (req, res) => {
  const message = String(req.body?.message || req.body?.prompt || '').trim();
  const threadId = String(req.body?.threadId || `thread_${Date.now()}`).trim();
  const projectId = String(req.body?.projectId || 'default').trim() || 'default';
  const runId = uuidv4();
  const executionMode = String(req.body?.executionMode || 'multiple_agents').trim();
  const mode = executionMode === 'linear' || executionMode === 'mock' ? executionMode : 'multiple_agents';

  if (!message) {
    res.status(400).json({ success: false, error: 'message_required' });
    return;
  }

  try {
    ensureThreadInProject(projectId, threadId);
    appendThreadMessage(threadId, 'user', message);

    const finalState = await executeQuasiLinearRun({
      plane_issue_id: String(req.body?.ticketId || '').trim(),
      pipeline_run_id: runId,
      thread_id: threadId,
      status: 'initialized',
      executionOptions: { mode },
      messages: [{ role: 'user', content: message }],
      artifactLogs: [message],
      projectId,
      workspacePath: process.cwd(),
    });

    const assistantMessage = [...(finalState.messages || [])]
      .reverse()
      .find((m: { role: string; content: string }) => m.role === 'assistant')?.content;
    const artifactLogs = Array.isArray(finalState.artifactLogs) ? finalState.artifactLogs : [];
    const parseArtifactMessage = (log?: string): string | null => {
      if (!log) return null;
      const match = String(log).match(/message=(.*)$/);
      return (match?.[1] || '').trim() || null;
    };
    const lastNonFinalizeArtifact = [...artifactLogs]
      .reverse()
      .find((entry) => !String(entry).includes('[stage:finalize]'));
    const finalMessage =
      (assistantMessage && assistantMessage.trim()) ||
      parseArtifactMessage(lastNonFinalizeArtifact) ||
      parseArtifactMessage(artifactLogs[artifactLogs.length - 1]) ||
      'Run completed.';
    ensureThreadInProject(projectId, threadId);
    appendThreadMessage(threadId, 'agent', finalMessage);

    res.json({
      success: true,
      status: finalState.status || 'completed',
      threadId,
      runId,
      ticketId: finalState.plane_issue_id || null,
      message: finalMessage,
      logs: artifactLogs,
      observability: {
        pipeline: finalState.selected_pipeline || 'unified-task-intake',
        stage: finalState.status || 'completed',
        nextStage: finalState.status === 'pipeline_completed' ? 'finalize' : 'swarm',
        blockingGates: '',
        approvalRequired: false,
        approvalReason: '',
      },
      gitContext: {
        activeBranch: runtimeFooter.activeBranch,
        worktreePath: runtimeFooter.worktreePath,
        preflightToken: runtimeFooter.preflightToken,
      },
    });
  } catch (error: any) {
    console.error('[agent-system-backend] /api/chat error:', error);
    res.status(500).json({
      success: false,
      error: 'chat_execution_failed',
      message: error?.message || 'Failed to execute runtime loop',
      threadId,
      runId,
    });
  }
});

app.post('/api/chat/approve', (_req, res) => {
  const threadId = String(_req.body?.threadId || '').trim();
  if (threadId) {
    appendThreadMessage(threadId, 'agent', 'Approval acknowledged');
  }
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

  const seenEventIds = new Set<string>();
  let streamClosed = false;

  const sendEvent = (payload: unknown) => {
    if (streamClosed) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent({ event_type: 'runtime.idle', status: 'ok', timestamp: new Date().toISOString() });

  const pollRecentEvents = async () => {
    try {
      const recent = await fetchRecentEvents(25);
      const chronological = recent.reverse();
      for (const event of chronological) {
        const id = `${event.event_id}:${event.timestamp}`;
        if (seenEventIds.has(id)) continue;
        seenEventIds.add(id);
        if (seenEventIds.size > 300) {
          const first = seenEventIds.values().next().value as string | undefined;
          if (first) seenEventIds.delete(first);
        }
        sendEvent(event);
      }
    } catch (error) {
      console.error('[agent-system-backend] SSE poll error:', error);
    }
  };

  void pollRecentEvents();

  const eventsPoller = setInterval(() => {
    void pollRecentEvents();
  }, 1500);

  const keepAlive = setInterval(() => {
    if (streamClosed) return;
    res.write(`: keep-alive ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    streamClosed = true;
    clearInterval(eventsPoller);
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
