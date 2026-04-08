import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { executeRuntimeRun, resumeRuntimeRun } from '../runtime/graphs/RuntimeExecutionRouter';
import { detectLanguage } from '../runtime/LanguageDetection';
import { fetchRecentEvents } from '../runtime/events/EventBus';
import { updateCockpitExecutorConfig, getCockpitExecutorConfig } from '../runtime/CockpitExecutorConfig';
import { DynamicDiscoveryService, AgentRegistry, PipelineRegistry, SkillRegistry } from '../runtime/DynamicDiscoveryService';
import { runExternalExecutor } from '../runtime/ExternalExecutionAdapter';

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
const projectStore = new Map<string, { id: string; label: string; worktreePath?: string; agentContextPath?: string }>();
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
type CatalogSnapshot = {
  discoveryRoot: string;
  agents: ReturnType<typeof AgentRegistry.getAllAgents>;
  pipelines: ReturnType<typeof PipelineRegistry.getAllPipelines>;
  skills: ReturnType<typeof SkillRegistry.getAllSkills>;
  loadedAt: string;
};
const projectCatalogCache = new Map<string, { signature: string; snapshot: CatalogSnapshot }>();

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
const SETTINGS_LEGACY_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-settings.json');
const RUNTIME_STORE_LEGACY_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-runtime-store.json');
const RUNTIME_DB_FILE_PATH = path.resolve(process.cwd(), '.agent-system', 'cockpit-runtime.db');

fs.mkdirSync(path.dirname(RUNTIME_DB_FILE_PATH), { recursive: true });
const runtimeDb = new Database(RUNTIME_DB_FILE_PATH);
runtimeDb.pragma('journal_mode = WAL');
runtimeDb.exec(`
  CREATE TABLE IF NOT EXISTS cockpit_projects (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    worktree_path TEXT,
    agent_context_path TEXT
  );
  CREATE TABLE IF NOT EXISTS cockpit_threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cockpit_threads_project ON cockpit_threads(project_id);
  CREATE TABLE IF NOT EXISTS cockpit_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cockpit_messages_thread_order ON cockpit_messages(thread_id, sort_order);
  CREATE TABLE IF NOT EXISTS cockpit_settings (
    section TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cockpit_state (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN agent_context_path TEXT`);
} catch {
  // Column already exists on upgraded instances.
}

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

const saveRuntimeState = (key: string, value: unknown) => {
  runtimeDb
    .prepare(
      `INSERT INTO cockpit_state (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), new Date().toISOString());
};

const loadRuntimeState = <T>(key: string, fallback: T): T => {
  const row = runtimeDb
    .prepare('SELECT value_json FROM cockpit_state WHERE key = ?')
    .get(key) as { value_json?: string } | undefined;
  if (!row?.value_json) return fallback;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
};

const persistSettingsStore = () => {
  try {
    const tx = runtimeDb.transaction(() => {
      runtimeDb.prepare('DELETE FROM cockpit_settings').run();
      const upsert = runtimeDb.prepare(
        `INSERT INTO cockpit_settings (section, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(section) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
      );
      const now = new Date().toISOString();
      for (const [section, value] of settingsStore.entries()) {
        upsert.run(section, JSON.stringify(value), now);
      }
    });
    tx();
  } catch (error) {
    console.error('[agent-system-backend] failed to persist settings store:', error);
  }
};

const restoreSettingsStore = () => {
  try {
    settingsStore.clear();
    const rows = runtimeDb
      .prepare('SELECT section, value_json FROM cockpit_settings')
      .all() as Array<{ section: string; value_json: string }>;

    if (rows.length > 0) {
      for (const row of rows) {
        try {
          settingsStore.set(row.section, JSON.parse(row.value_json));
        } catch {
          settingsStore.set(row.section, {});
        }
      }
      return;
    }

    // One-time migration from legacy JSON settings file.
    if (!fs.existsSync(SETTINGS_LEGACY_FILE_PATH)) return;
    const raw = fs.readFileSync(SETTINGS_LEGACY_FILE_PATH, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    Object.entries(parsed).forEach(([key, value]) => settingsStore.set(key, value));
    persistSettingsStore();
  } catch (error) {
    console.error('[agent-system-backend] failed to restore settings store:', error);
  }
};

const persistRuntimeStore = () => {
  try {
    const tx = runtimeDb.transaction(() => {
      runtimeDb.prepare('DELETE FROM cockpit_projects').run();
      runtimeDb.prepare('DELETE FROM cockpit_threads').run();
      runtimeDb.prepare('DELETE FROM cockpit_messages').run();

      const insertProject = runtimeDb.prepare(
        'INSERT INTO cockpit_projects (id, label, worktree_path, agent_context_path) VALUES (?, ?, ?, ?)',
      );
      const insertThread = runtimeDb.prepare(
        'INSERT INTO cockpit_threads (id, project_id, label, updated_at) VALUES (?, ?, ?, ?)',
      );
      const insertMessage = runtimeDb.prepare(
        'INSERT INTO cockpit_messages (id, thread_id, role, content, timestamp, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      );

      for (const project of projectStore.values()) {
        insertProject.run(project.id, project.label, project.worktreePath || null, project.agentContextPath || null);
      }
      for (const [projectId, threads] of threadStore.entries()) {
        for (const thread of threads) {
          insertThread.run(thread.id, projectId, thread.label, thread.updatedAt);
        }
      }
      for (const [threadId, messages] of threadMessageStore.entries()) {
        messages.forEach((message, index) => {
          insertMessage.run(
            message.id,
            threadId,
            message.role,
            message.content,
            message.timestamp,
            index,
          );
        });
      }
    });
    tx();
  } catch (error) {
    console.error('[agent-system-backend] failed to persist runtime store:', error);
  }
};

const restoreRuntimeStore = () => {
  try {
    projectStore.clear();
    threadStore.clear();
    threadMessageStore.clear();

    const projects = runtimeDb.prepare(
      'SELECT id, label, worktree_path, agent_context_path FROM cockpit_projects ORDER BY id',
    ).all() as Array<{ id: string; label: string; worktree_path: string | null; agent_context_path: string | null }>;
    const threads = runtimeDb.prepare(
      'SELECT id, project_id, label, updated_at FROM cockpit_threads ORDER BY updated_at DESC',
    ).all() as Array<{ id: string; project_id: string; label: string; updated_at: string }>;
    const messages = runtimeDb.prepare(
      'SELECT id, thread_id, role, content, timestamp FROM cockpit_messages ORDER BY thread_id, sort_order ASC',
    ).all() as Array<{ id: string; thread_id: string; role: 'user' | 'agent'; content: string; timestamp: string }>;

    for (const project of projects) {
      projectStore.set(project.id, {
        id: project.id,
        label: project.label || project.id,
        ...(project.worktree_path ? { worktreePath: project.worktree_path } : {}),
        ...(project.agent_context_path ? { agentContextPath: project.agent_context_path } : {}),
      });
    }
    for (const thread of threads) {
      const existing = threadStore.get(thread.project_id) || [];
      existing.push({
        id: thread.id,
        label: thread.label,
        updatedAt: thread.updated_at,
      });
      threadStore.set(thread.project_id, existing);
    }
    for (const message of messages) {
      const existing = threadMessageStore.get(message.thread_id) || [];
      existing.push({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
      });
      threadMessageStore.set(message.thread_id, existing);
    }

    // One-time migration from legacy JSON store if DB is still empty.
    if (
      projectStore.size === 0 &&
      fs.existsSync(RUNTIME_STORE_LEGACY_FILE_PATH)
    ) {
      const raw = fs.readFileSync(RUNTIME_STORE_LEGACY_FILE_PATH, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw) as {
          projects?: Array<{ id: string; label: string; worktreePath?: string; agentContextPath?: string }>;
          threadsByProject?: Record<string, Array<{ id: string; label: string; updatedAt: string }>>;
          messagesByThread?: Record<string, PersistedChatMessage[]>;
        };
        (parsed.projects || []).forEach((project) => {
          if (!project?.id) return;
          projectStore.set(project.id, {
            id: project.id,
            label: project.label || project.id,
            ...(project.worktreePath ? { worktreePath: project.worktreePath } : {}),
            ...(project.agentContextPath ? { agentContextPath: project.agentContextPath } : {}),
          });
        });
        Object.entries(parsed.threadsByProject || {}).forEach(([projectId, projectThreads]) => {
          threadStore.set(projectId, Array.isArray(projectThreads) ? projectThreads : []);
        });
        Object.entries(parsed.messagesByThread || {}).forEach(([threadId, threadMessages]) => {
          threadMessageStore.set(
            threadId,
            (Array.isArray(threadMessages) ? threadMessages : []).filter(
              (message) =>
                Boolean(message?.id) &&
                (message?.role === 'user' || message?.role === 'agent') &&
                typeof message?.content === 'string' &&
                typeof message?.timestamp === 'string',
            ),
          );
        });
        persistRuntimeStore();
      }
    }
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

const syncPlaneBindingForProject = async (
  project: { id: string; label: string },
  options?: { preferredPlaneProjectId?: string; createIfMissing?: boolean },
) => {
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
  const preferredPlaneProjectId = String(options?.preferredPlaneProjectId || '').trim();
  const createIfMissing = options?.createIfMissing !== false;

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
    const existing = preferredPlaneProjectId
      ? projects.find((p) => p.id === preferredPlaneProjectId)
      : projects.find(
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

    if (!createIfMissing) {
      planeBindingStore.set(project.id, {
        cockpitProjectId: project.id,
        status: 'error',
        message: preferredPlaneProjectId
          ? `Preferred Plane project was not found: ${preferredPlaneProjectId}`
          : 'Plane project is required. Select an existing project or explicitly allow creation.',
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

const fetchPlaneProjects = async (): Promise<Array<{ id: string; name: string; identifier: string }>> => {
  if (!canUsePlane()) return [];
  const apiRoot = `${PLANE_BASE_URL}/api/v1/workspaces/${PLANE_WORKSPACE}`;
  const headers = { 'X-Api-Key': PLANE_API_KEY, 'Content-Type': 'application/json' };
  const listRes = await fetch(`${apiRoot}/projects/`, { headers });
  if (!listRes.ok) return [];
  const rawProjects = await listRes.json() as
    | Array<{ id: string; name: string; identifier: string }>
    | { results?: Array<{ id: string; name: string; identifier: string }> };
  const projects = Array.isArray(rawProjects) ? rawProjects : (rawProjects?.results || []);
  return projects
    .filter((p) => Boolean(p?.id))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
};

const normalizeWorktreePath = (raw?: string): string | undefined => {
  const value = String(raw || '').trim();
  if (!value) return undefined;
  if (path.isAbsolute(value)) return value;

  const runtimeBase = runtimeFooter?.worktreePath
    ? (path.isAbsolute(runtimeFooter.worktreePath)
      ? path.dirname(runtimeFooter.worktreePath)
      : path.resolve(process.cwd(), path.dirname(runtimeFooter.worktreePath)))
    : '';

  const baseCandidates = [
    runtimeBase,
    path.dirname(process.cwd()),
    process.cwd(),
  ].filter(Boolean);

  for (const base of baseCandidates) {
    const candidate = path.resolve(base, value);
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore fs errors and fallback below
    }
  }
  return path.resolve(path.dirname(process.cwd()), value);
};

const ensureProject = (id: string, label: string, worktreePath?: string, agentContextPath?: string) => {

  const existing = projectStore.get(id);
  const normalizedWorktree = normalizeWorktreePath(worktreePath);
  const normalizedAgentContext = normalizeWorktreePath(agentContextPath);
  if (!existing) {
    projectStore.set(id, {
      id,
      label,
      ...(normalizedWorktree ? { worktreePath: normalizedWorktree } : {}),
      ...(normalizedAgentContext ? { agentContextPath: normalizedAgentContext } : {}),
    });
    threadStore.set(id, []);
    persistRuntimeStore();
    return;
  }
  existing.label = label;
  if (normalizedWorktree) {
    existing.worktreePath = normalizedWorktree;
  }
  if (normalizedAgentContext) {
    existing.agentContextPath = normalizedAgentContext;
  }
  projectStore.set(id, existing);
  persistRuntimeStore();
};

const resolveGitBranch = (worktreePath?: string): string => {
  const target = String(worktreePath || '').trim();
  if (!target) return runtimeFooter.activeBranch || 'main';
  try {
    const branch = execSync(`git -C "${target}" rev-parse --abbrev-ref HEAD`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
    return branch || (runtimeFooter.activeBranch || 'main');
  } catch {
    return runtimeFooter.activeBranch || 'main';
  }
};

const validateProjectWorktree = (rawPath?: string): { ok: true; absolutePath: string } | { ok: false; error: string; message: string } => {
  const inputPath = String(rawPath || '').trim();
  if (!inputPath) {
    return {
      ok: false,
      error: 'worktree_path_required',
      message: 'Project directory is required.',
    };
  }
  if (!path.isAbsolute(inputPath)) {
    return {
      ok: false,
      error: 'worktree_path_must_be_absolute',
      message: 'Project directory must be an absolute path.',
    };
  }
  const normalized = normalizeWorktreePath(inputPath);
  if (!normalized) {
    return {
      ok: false,
      error: 'worktree_path_required',
      message: 'Project directory is required.',
    };
  }
  if (!fs.existsSync(normalized)) {
    return {
      ok: false,
      error: 'worktree_path_not_found',
      message: `Directory does not exist: ${normalized}`,
    };
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(normalized);
  } catch {
    return {
      ok: false,
      error: 'worktree_path_not_accessible',
      message: `Directory is not accessible: ${normalized}`,
    };
  }
  if (!stat.isDirectory()) {
    return {
      ok: false,
      error: 'worktree_path_not_directory',
      message: `Path is not a directory: ${normalized}`,
    };
  }

  try {
    const isGitWorktree = execSync(`git -C "${normalized}" rev-parse --is-inside-work-tree`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
    if (isGitWorktree !== 'true') {
      return {
        ok: false,
        error: 'worktree_not_git_repo',
        message: `Directory is not a git repository: ${normalized}`,
      };
    }
  } catch {
    return {
      ok: false,
      error: 'worktree_not_git_repo',
      message: `Directory is not a git repository: ${normalized}`,
    };
  }

  return { ok: true, absolutePath: normalized };
};

const validateAgentContextPath = (
  rawPath?: string,
): { ok: true; absolutePath: string } | { ok: false; error: string; message: string } => {
  const inputPath = String(rawPath || '').trim();
  if (!inputPath) {
    return {
      ok: false,
      error: 'agent_context_path_required',
      message: 'Agent files directory is required.',
    };
  }
  if (!path.isAbsolute(inputPath)) {
    return {
      ok: false,
      error: 'agent_context_path_must_be_absolute',
      message: 'Agent files directory must be an absolute path.',
    };
  }
  const normalized = normalizeWorktreePath(inputPath);
  if (!normalized || !fs.existsSync(normalized)) {
    return {
      ok: false,
      error: 'agent_context_path_not_found',
      message: `Agent files directory does not exist: ${normalized || inputPath}`,
    };
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(normalized);
  } catch {
    return {
      ok: false,
      error: 'agent_context_path_not_accessible',
      message: `Agent files directory is not accessible: ${normalized}`,
    };
  }
  if (!stat.isDirectory()) {
    return {
      ok: false,
      error: 'agent_context_path_not_directory',
      message: `Agent files path is not a directory: ${normalized}`,
    };
  }
  if (!fs.existsSync(path.resolve(normalized, 'AGENTS.md'))) {
    return {
      ok: false,
      error: 'agent_context_manifest_missing',
      message: `AGENTS.md was not found in agent files directory: ${normalized}`,
    };
  }
  return { ok: true, absolutePath: normalized };
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

const buildCatalogSignature = (discoveryRoot: string): string => {
  const normalizedRoot = path.resolve(discoveryRoot || process.cwd());
  const manifestPath = path.resolve(normalizedRoot, 'AGENTS.md');
  try {
    const stat = fs.existsSync(manifestPath) ? fs.statSync(manifestPath) : null;
    if (!stat) return `${normalizedRoot}:manifest-missing`;
    return `${normalizedRoot}:${stat.size}:${stat.mtimeMs}`;
  } catch {
    return `${normalizedRoot}:manifest-unreadable`;
  }
};

const applyCatalogSnapshotToRegistries = (snapshot: CatalogSnapshot) => {
  AgentRegistry.clear();
  for (const agent of snapshot.agents) AgentRegistry.register(agent);
  PipelineRegistry.clear();
  for (const pipeline of snapshot.pipelines) PipelineRegistry.register(pipeline);
  SkillRegistry.clear();
  for (const skill of snapshot.skills) SkillRegistry.register(skill);
};

const loadProjectCatalogSnapshot = async (
  discoveryRoot?: string,
  options?: { forceRefresh?: boolean; activate?: boolean },
): Promise<CatalogSnapshot> => {
  const root = path.resolve(discoveryRoot || process.cwd());
  const signature = buildCatalogSignature(root);
  const cached = projectCatalogCache.get(root);
  if (!options?.forceRefresh && cached && cached.signature === signature) {
    if (options?.activate) applyCatalogSnapshotToRegistries(cached.snapshot);
    return cached.snapshot;
  }

  await DynamicDiscoveryService.discoverAll(root);
  const snapshot: CatalogSnapshot = {
    discoveryRoot: root,
    agents: AgentRegistry.getAllAgents(),
    pipelines: PipelineRegistry.getAllPipelines(),
    skills: SkillRegistry.getAllSkills(),
    loadedAt: new Date().toISOString(),
  };
  projectCatalogCache.set(root, { signature, snapshot });
  if (options?.activate) applyCatalogSnapshotToRegistries(snapshot);
  return snapshot;
};

const refreshCatalog = async (discoveryRoot?: string, options?: { forceRefresh?: boolean; activate?: boolean }) => {
  try {
    return await loadProjectCatalogSnapshot(discoveryRoot, options);
  } catch (error) {
    console.error('[agent-system-backend] catalog discovery error:', error);
    return {
      discoveryRoot: path.resolve(discoveryRoot || process.cwd()),
      agents: [],
      pipelines: [],
      skills: [],
      loadedAt: new Date().toISOString(),
    } as CatalogSnapshot;
  }
};

const getAgentCallsignMapFromManifest = (discoveryRoot?: string): Record<string, string> => {
  try {
    const manifestPath = path.resolve(discoveryRoot || process.cwd(), 'AGENTS.md');
    if (!fs.existsSync(manifestPath)) return {};
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const map: Record<string, string> = {};
    const matches = Array.from(
      raw.matchAll(/-\s*Callsign:\s*`([^`]+)`[\s\S]*?-\s*File:\s*`(\.\/[^`]+\/agents\/[^`]+\.md)`/g),
    );
    for (const match of matches) {
      const callsign = String(match[1] || '').replace(/^`+|`+$/g, '').trim();
      const relAgentPath = String(match[2] || '').trim();
      const slug = path.basename(relAgentPath, '.md');
      if (!slug || !callsign) continue;
      map[slug] = callsign;
    }
    return map;
  } catch {
    return {};
  }
};

restoreRuntimeStore();
let normalizedLegacyProjects = false;
for (const [projectId, project] of projectStore.entries()) {
  const raw = String(project.worktreePath || '').trim();
  const rawAgent = String(project.agentContextPath || '').trim();
  let next = { ...project };
  if (raw && !path.isAbsolute(raw)) {
    const normalized = normalizeWorktreePath(raw);
    if (normalized) {
      next.worktreePath = normalized;
      normalizedLegacyProjects = true;
    }
  }
  if (rawAgent && !path.isAbsolute(rawAgent)) {
    const normalizedAgent = normalizeWorktreePath(rawAgent);
    if (normalizedAgent) {
      next.agentContextPath = normalizedAgent;
      normalizedLegacyProjects = true;
    }
  }
  if (next !== project) {
    projectStore.set(projectId, next);
  }
}
if (normalizedLegacyProjects) {
  persistRuntimeStore();
}
for (const project of projectStore.values()) {
  void syncPlaneBindingForProject(project);
}
restoreSettingsStore();
runtimeFooter = loadRuntimeState('runtime_footer', runtimeFooter);
runtimeSelection = loadRuntimeState('runtime_selection', runtimeSelection);
void refreshCatalog();
const runtimeFromSettingsAtBoot = getRuntimeSelectionFromExecutorSettings();
if (runtimeFromSettingsAtBoot) {
  runtimeSelection = runtimeFromSettingsAtBoot;
  saveRuntimeState('runtime_selection', runtimeSelection);
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
  const snapshot = await refreshCatalog();
  const agents = snapshot.agents.map((agent) => agent.slug).sort();
  const pipelines = snapshot.pipelines.map((pipeline) => pipeline.slug).sort();
  const skills = snapshot.skills.map((skill) => skill.id).sort();
  res.json({
    success: true,
    agents,
    pipelines,
    skills,
  });
});

app.get('/api/cockpit/agents/registry', async (_req, res) => {
  const projectId = String(_req.query?.projectId || '').trim();
  const project = projectStore.get(projectId);
  const discoveryRoot = project?.agentContextPath || project?.worktreePath || process.cwd();
  const snapshot = await refreshCatalog(discoveryRoot);
  const callsignsBySlug = getAgentCallsignMapFromManifest(discoveryRoot);
  const agents = snapshot.agents
    .map((agent) => ({
      slug: agent.slug,
      title: agent.title || agent.slug,
      callsign: callsignsBySlug[agent.slug] || agent.callsign || agent.title || agent.slug,
      sourcePath: agent.sourcePath || '',
      available: true,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  res.json({ success: true, agents });
});

app.get('/api/cockpit/swarm/workers', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const heartbeatTimeoutMs = Number(
      _req.query?.heartbeatTimeoutMs || process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000,
    );
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    DynamicWorkerSpawnManager.pruneIdleWorkers({
      projectId: projectId || undefined,
      idleTimeoutMs: Number(process.env.RUNTIME_WORKER_IDLE_TIMEOUT_MS || 120000),
    });
    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({
      projectId: projectId || undefined,
      heartbeatTimeoutMs,
    });
    const queueDepthByKey = ProjectDispatchQueue.snapshot(projectId || undefined);
    res.json({
      success: true,
      workers,
      queueDepthByKey,
      summary: {
        total: workers.length,
        healthy: workers.filter((w: any) => w.heartbeatFreshness === 'fresh').length,
        stale: workers.filter((w: any) => w.heartbeatFreshness === 'stale').length,
        dead: workers.filter((w: any) => w.heartbeatFreshness === 'dead').length,
      },
      heartbeatTimeoutMs,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_workers_fetch_failed',
      message: error?.message || 'Failed to fetch worker health snapshot',
    });
  }
});

app.get('/api/cockpit/swarm/summary', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const heartbeatTimeoutMs = Number(
      _req.query?.heartbeatTimeoutMs || process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000,
    );
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({
      projectId: projectId || undefined,
      heartbeatTimeoutMs,
    });
    const queueDepthByKey = ProjectDispatchQueue.snapshot(projectId || undefined);
    const queuePressure = Object.values(queueDepthByKey).reduce((acc, n) => acc + Number(n || 0), 0);
    const activeWorkers = workers.filter((w: any) => String(w.executionState) === 'active').length;
    const standbyWorkers = workers.filter((w: any) => String(w.executionState) === 'standby').length;
    const unhealthyWorkers = workers.filter((w: any) => w.heartbeatFreshness === 'stale' || w.heartbeatFreshness === 'dead').length;

    res.json({
      success: true,
      projectId: projectId || null,
      summary: {
        workersTotal: workers.length,
        activeWorkers,
        standbyWorkers,
        unhealthyWorkers,
        queuePressure,
      },
      queueDepthByKey,
      workers,
      heartbeatTimeoutMs,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_summary_fetch_failed',
      message: error?.message || 'Failed to build swarm summary',
    });
  }
});

app.get('/api/cockpit/swarm/utilization', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const rows = DynamicWorkerSpawnManager.utilizationSnapshot({
      projectId: projectId || undefined,
    });
    const totals = rows.reduce(
      (acc, row) => {
        acc.invocationCount += Number(row.invocationCount || 0);
        acc.coldStartCount += Number(row.coldStartCount || 0);
        acc.totalTaskDurationMs += Number(row.totalTaskDurationMs || 0);
        acc.totalIdleMs += Number(row.totalIdleMs || 0);
        return acc;
      },
      { invocationCount: 0, coldStartCount: 0, totalTaskDurationMs: 0, totalIdleMs: 0 },
    );
    const avgTaskDurationMs =
      totals.invocationCount > 0 ? Math.round(totals.totalTaskDurationMs / totals.invocationCount) : 0;
    res.json({
      success: true,
      projectId: projectId || null,
      rows,
      summary: {
        workers: rows.length,
        invocationCount: totals.invocationCount,
        coldStartCount: totals.coldStartCount,
        totalTaskDurationMs: totals.totalTaskDurationMs,
        avgTaskDurationMs,
        totalIdleMs: totals.totalIdleMs,
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_utilization_fetch_failed',
      message: error?.message || 'Failed to fetch swarm utilization telemetry',
    });
  }
});

app.get('/api/cockpit/providers', (_req, res) => {
  const runtimeFromSettings = getRuntimeSelectionFromExecutorSettings();
  if (runtimeFromSettings) {
    runtimeSelection = runtimeFromSettings;
    saveRuntimeState('runtime_selection', runtimeSelection);
  } else if (!isRuntimeProvider(runtimeSelection.provider)) {
    runtimeSelection = {
      provider: 'codex-cli',
      model: providerModelCatalog['codex-cli'][0],
    };
    saveRuntimeState('runtime_selection', runtimeSelection);
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

const buildChainsPayload = () => {
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
  return { success: true, projects, threadsByProject, planeBindings };
};

app.post('/api/cockpit/chains', (req, res) => {
  const projectId = String(req.body?.projectId || '').trim();
  const projectLabel = String(req.body?.projectLabel || '').trim();
  const worktreePath = String(req.body?.worktreePath || '').trim();
  const agentContextPath = String(req.body?.agentContextPath || '').trim();
  const selectedPlaneProjectId = String(req.body?.planeProjectId || '').trim();
  const createPlaneProject = Boolean(req.body?.createPlaneProject);
  const label = String(req.body?.label || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'project_id_required' });
    return;
  }

  const creatingProject = !projectStore.has(projectId);
  if (creatingProject) {
    if (projectId !== '__unbound__') {
      const validation = validateProjectWorktree(worktreePath || undefined);
      if ('error' in validation) {
        res.status(400).json({ success: false, error: validation.error, message: validation.message });
        return;
      }
      const agentPathValidation = validateAgentContextPath(agentContextPath || undefined);
      if ('error' in agentPathValidation) {
        res.status(400).json({ success: false, error: agentPathValidation.error, message: agentPathValidation.message });
        return;
      }

      if (!selectedPlaneProjectId && !createPlaneProject) {
        res.status(400).json({
          success: false,
          error: 'plane_project_required',
          message: 'Select an existing Plane project or explicitly enable new project creation.',
        });
        return;
      }
    }
    const derivedLabel = projectId === '__unbound__' ? 'Unbound' : (projectLabel || projectId);
    ensureProject(projectId, derivedLabel, worktreePath || undefined, agentContextPath || undefined);
  } else if (projectLabel || worktreePath || agentContextPath) {
    if (worktreePath) {
      const validation = validateProjectWorktree(worktreePath);
      if ('error' in validation) {
        res.status(400).json({ success: false, error: validation.error, message: validation.message });
        return;
      }
    }
    if (agentContextPath) {
      const agentPathValidation = validateAgentContextPath(agentContextPath);
      if ('error' in agentPathValidation) {
        res.status(400).json({ success: false, error: agentPathValidation.error, message: agentPathValidation.message });
        return;
      }
    }
    const existing = projectStore.get(projectId)!;
    ensureProject(
      projectId,
      projectLabel || existing.label,
      worktreePath || existing.worktreePath,
      agentContextPath || existing.agentContextPath,
    );
  }
  const project = projectStore.get(projectId);
  if (project) {
    if (creatingProject) {
      void syncPlaneBindingForProject(project, {
        preferredPlaneProjectId: selectedPlaneProjectId || undefined,
        createIfMissing: createPlaneProject,
      });
    } else {
      void syncPlaneBindingForProject(project);
    }
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

  res.json({ ...buildChainsPayload(), thread: nextThread });
});

app.get('/api/cockpit/plane/projects', async (_req, res) => {
  if (!canUsePlane()) {
    res.json({
      success: true,
      configured: false,
      projects: [],
      message: 'Plane is not configured (PLANE_API_TOKEN / PLANE_BASE_URL / PLANE_WORKSPACE).',
    });
    return;
  }
  const projects = await fetchPlaneProjects();
  res.json({
    success: true,
    configured: true,
    projects,
  });
});

app.delete('/api/cockpit/chains/:threadId', (req, res) => {
  const threadId = String(req.params.threadId || '').trim();
  if (!threadId) {
    res.status(400).json({ success: false, error: 'thread_id_required' });
    return;
  }

  let removed = false;
  for (const [projectId, threads] of threadStore.entries()) {
    const nextThreads = threads.filter((t) => t.id !== threadId);
    if (nextThreads.length !== threads.length) {
      removed = true;
      threadStore.set(projectId, nextThreads);
    }
  }
  if (removed) {
    threadMessageStore.delete(threadId);
    persistRuntimeStore();
  }

  res.json({ ...buildChainsPayload(), removedThreadId: threadId, removed });
});

app.delete('/api/cockpit/projects/:projectId', (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    res.status(400).json({ success: false, error: 'project_id_required' });
    return;
  }
  if (!projectStore.has(projectId)) {
    res.status(404).json({ success: false, error: 'project_not_found' });
    return;
  }
  const threads = threadStore.get(projectId) || [];
  for (const thread of threads) {
    threadMessageStore.delete(thread.id);
  }
  threadStore.delete(projectId);
  projectStore.delete(projectId);
  planeBindingStore.delete(projectId);

  persistRuntimeStore();
  res.json({ ...buildChainsPayload(), removedProjectId: projectId, removed: true });
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

app.post('/api/cockpit/projects/select', async (req, res) => {
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
    const normalizedWorktree = normalizeWorktreePath(project.worktreePath) || project.worktreePath.trim();
    const nextBranch = resolveGitBranch(normalizedWorktree);
    runtimeFooter = {
      ...runtimeFooter,
      worktreePath: normalizedWorktree,
      activeBranch: nextBranch,
    };
    project.worktreePath = normalizedWorktree;
    projectStore.set(project.id, project);
    persistRuntimeStore();
    saveRuntimeState('runtime_footer', runtimeFooter);
  }

  const discoveryRoot = project.agentContextPath || project.worktreePath || process.cwd();
  await refreshCatalog(discoveryRoot, { activate: true });
  const { applyProjectSwitchRuntimePolicy } = await import('../runtime/policy/ProjectSwitchRuntimePolicy');
  const switchPolicy = await applyProjectSwitchRuntimePolicy({
    activeProjectId: projectId,
    knownProjectIds: Array.from(projectStore.keys()),
  });

  res.json({ success: true, project, runtimeFooter, switchPolicy });
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
  saveRuntimeState('runtime_footer', runtimeFooter);
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

app.post('/api/cockpit/providers/test-message', async (req, res) => {
  const provider = String(req.body?.provider || runtimeSelection.provider || 'codex-cli').trim();
  const model = String(req.body?.model || runtimeSelection.model || '').trim();
  const prompt = String(
    req.body?.prompt ||
      'Health-check prompt. Reply with exactly: LLM_TEST_OK',
  ).trim();

  const executor: 'claude-code' | 'codex-cli' | 'openhands-sdk' =
    provider === 'claude-cli'
      ? 'claude-code'
      : provider === 'openhands-sdk'
        ? 'openhands-sdk'
        : 'codex-cli';

  try {
    const result = await runExternalExecutor({
      executor,
      prompt,
      cwd: process.cwd(),
      model: model || undefined,
      timeoutMs: Number(process.env.COCKPIT_PROVIDER_TEST_TIMEOUT_MS || 45000),
    });

    const output = String(result.stdout || '').trim();
    const error = String(result.stderr || '').trim();
    res.json({
      success: result.ok,
      status: result.ok ? 'ok' : 'failed',
      provider,
      model: model || null,
      message: result.ok ? 'LLM test completed' : (error || 'Provider test failed'),
      result: {
        ok: result.ok,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdout: output.slice(0, 1200),
        stderr: error.slice(0, 1200),
        command: result.command,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'failed',
      provider,
      model: model || null,
      message: error?.message || 'Provider test execution failed',
      result: {
        ok: false,
        exitCode: -1,
        durationMs: 0,
        stdout: '',
        stderr: String(error?.message || error || 'unknown_error'),
        command: [],
      },
    });
  }
});

app.post('/api/cockpit/providers/select', (req, res) => {
  const requestedProvider = String(req.body?.provider || runtimeSelection.provider);
  const model = String(req.body?.model || runtimeSelection.model);
  const provider: RuntimeProvider = isRuntimeProvider(requestedProvider) ? requestedProvider : 'codex-cli';
  runtimeSelection = { provider, model };
  saveRuntimeState('runtime_selection', runtimeSelection);

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
      saveRuntimeState('runtime_selection', runtimeSelection);
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
  const detectedLanguage = detectLanguage(message);

  if (!message) {
    res.status(400).json({ success: false, error: 'message_required' });
    return;
  }

  try {
    const project = projectStore.get(projectId);
    const effectiveWorkspacePath = project?.worktreePath || process.cwd();
    const effectiveAgentContextPath = project?.agentContextPath || project?.worktreePath || process.cwd();
    const catalogSnapshot = await refreshCatalog(effectiveAgentContextPath, { activate: true });

    ensureThreadInProject(projectId, threadId);
    appendThreadMessage(threadId, 'user', message);

    const { RunManager } = await import('../runtime/context/RunManager');
    RunManager.registerRun(threadId, runId);

    try {
      const execution = await executeRuntimeRun({
        ticketId: String(req.body?.ticketId || '').trim(),
        runId,
        threadId,
        status: 'initialized',
        executionOptions: { mode },
        messages: [{ role: 'user', content: message }],
        artifactLogs: [message],
        projectId,
        workspacePath: effectiveWorkspacePath,
        agentContextPath: effectiveAgentContextPath,
        customAgents: catalogSnapshot.agents.map((agent) => agent.slug),
      });
      const finalState = execution.finalState;
      
      if (finalState.__interrupt__) {
        console.log(`[agent-system-backend] Run ${runId} interrupted for HITL:`, finalState.__interrupt__[0].value);
        res.json({
          success: true,
          interrupted: true,
          interrupt: finalState.__interrupt__[0].value,
          threadId,
          runId
        });
        return;
      }

      RunManager.completeRun(threadId, runId);

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
      const localizedRunCompleted =
        detectedLanguage === 'uk'
          ? 'Виконання завершено.'
          : detectedLanguage === 'ru'
            ? 'Выполнение завершено.'
            : detectedLanguage === 'be'
              ? 'Выкананне завершана.'
              : 'Run completed.';
      const explicitAssistantMessage = (assistantMessage && assistantMessage.trim()) || '';
      const finalMessage =
        explicitAssistantMessage ||
        (mode === 'multiple_agents'
          ? ''
          : parseArtifactMessage(lastNonFinalizeArtifact) ||
            parseArtifactMessage(artifactLogs[artifactLogs.length - 1]) ||
            localizedRunCompleted);
      ensureThreadInProject(projectId, threadId);
      if (finalMessage) {
        appendThreadMessage(threadId, 'agent', finalMessage);
      }

      res.json({
        success: true,
        status: finalState.status || 'completed',
        threadId,
        runId,
        ticketId: finalState.ticketId || null,
        message: finalMessage || null,
        logs: artifactLogs,
        observability: {
          pipeline: finalState.selected_pipeline || 'unified-task-intake',
          stage: finalState.status || 'completed',
          nextStage: finalState.status === 'pipeline_completed' ? 'finalize' : 'swarm',
          blockingGates: '',
          approvalRequired: false,
          approvalReason: '',
          modeRequested: execution.modeRequested,
          modeApplied: execution.modeApplied,
          engine: execution.engine,
        },
        gitContext: {
          activeBranch: runtimeFooter.activeBranch,
          worktreePath: runtimeFooter.worktreePath,
          preflightToken: runtimeFooter.preflightToken,
        },
      });
    } catch (error: any) {
      if (error.message?.includes('was cancelled')) {
        console.log(`[agent-system-backend] Request for run ${runId} was cancelled:`, error.message);
        // Do not return error to user if they just sent a new message, 
        // but the XHR might have already closed or we might want to return 204 or similar.
        // For now, let's just return success: false with a clear error.
        res.status(409).json({ success: false, error: 'run_cancelled', message: 'Current run was cancelled by a newer request.' });
      } else {
        console.error('[agent-system-backend] chat error:', error);
        res.status(500).json({ success: false, error: 'internal_error', message: error.message });
      }
    }
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

app.post('/api/chat/approve', async (req, res) => {
  const { threadId, decision } = req.body;

  if (!threadId) {
    res.status(400).json({ success: false, error: 'threadId_required' });
    return;
  }

  try {
    const execution = await resumeRuntimeRun(threadId, decision || 'approved');
    const finalState = execution.finalState;

    if (finalState.__interrupt__) {
      res.json({
        success: true,
        interrupted: true,
        interrupt: finalState.__interrupt__[0].value,
        threadId,
      });
      return;
    }

    // Logic to handle final completion after resumption
    const assistantMessage = [...(finalState.messages || [])]
      .reverse()
      .find((m: { role: string; content: string }) => m.role === 'assistant')?.content;

    const resolvedProjectId = String(finalState.projectId || 'default');
    ensureThreadInProject(resolvedProjectId, threadId);
    if (assistantMessage && String(assistantMessage).trim()) {
      appendThreadMessage(threadId, 'agent', String(assistantMessage));
    }

    res.json({
      success: true,
      message: assistantMessage || 'Resumed and completed.',
      finalState
    });
  } catch (error: any) {
    console.error('[agent-system-backend] /api/chat/approve error:', error);
    res.status(500).json({ success: false, error: 'internal_error', message: error.message });
  }
});

app.post('/api/chat/cancel', async (req, res) => {
  const threadId = String(req.body?.threadId || '').trim();
  const runId = String(req.body?.runId || '').trim();
  const reason = String(req.body?.reason || 'Cancelled by user').trim();

  if (!threadId && !runId) {
    res.status(400).json({ success: false, error: 'threadId_or_runId_required' });
    return;
  }

  try {
    const { RunManager } = await import('../runtime/context/RunManager');
    if (runId) {
      RunManager.cancelRun(runId, reason);
      res.json({ success: true, cancelled: true, runId });
      return;
    }
    const result = RunManager.cancelThreadRun(threadId, reason);
    res.json({ success: true, cancelled: result.cancelled, runId: result.runId, threadId });
  } catch (error: any) {
    console.error('[agent-system-backend] /api/chat/cancel error:', error);
    res.status(500).json({ success: false, error: 'internal_error', message: error?.message || 'Failed to cancel run' });
  }
});

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const seenEventIds = new Set<string>();
  let streamClosed = false;

  const sendEvent = (payload: any) => {
    if (streamClosed) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Initial heartbeat/idle event using new schema
  sendEvent({
    id: uuidv4(),
    runId: 'none',
    projectId: 'none',
    chainId: 'none',
    type: 'system.thought', // or a new 'system.idle' if we add it
    actor: { type: 'system', id: 'backend' },
    payload: { message: 'Runtime stream initialized' },
    timestamp: Date.now()
  });

  const pollRecentEvents = async () => {
    try {
      const recent = await fetchRecentEvents(50);
      const chronological = recent.reverse();
      for (const event of chronological) {
        // New schema uses 'id' and numeric 'timestamp'
        const uniqueKey = `${event.id}:${event.timestamp}`;
        if (seenEventIds.has(uniqueKey)) continue;
        seenEventIds.add(uniqueKey);
        
        // LRU-style cleanup for the seen set
        if (seenEventIds.size > 500) {
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
  }, 1000); // Poll slightly faster for better responsiveness

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
