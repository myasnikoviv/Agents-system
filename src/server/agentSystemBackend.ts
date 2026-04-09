import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { PostgresControlPlaneStore } from './storage/PostgresControlPlaneStore';
import { SqliteObjectStorageService } from './storage/ObjectStorageService';
import { SqliteSecretsStore } from './storage/SecretsStore';
import { executeRuntimeRun, resumeRuntimeRun } from '../runtime/graphs/RuntimeExecutionRouter';
import { detectLanguage } from '../runtime/LanguageDetection';
import { fetchRecentEvents, fetchEventsByRunId } from '../runtime/events/EventBus';
import { updateCockpitExecutorConfig, getCockpitExecutorConfig } from '../runtime/CockpitExecutorConfig';
import { DynamicDiscoveryService, AgentRegistry, PipelineRegistry, SkillRegistry } from '../runtime/DynamicDiscoveryService';
import { runExternalExecutor } from '../runtime/ExternalExecutionAdapter';
import { registerTelemetryRoutes } from './routes/telemetryRoutes';
import { registerProviderSettingsRoutes } from './routes/providerSettingsRoutes';
import { registerChainProjectRoutes } from './routes/chainProjectRoutes';
import { registerSecretsRoutes } from './routes/secretsRoutes';
import { registerAttachmentStorageRoutes } from './routes/attachmentStorageRoutes';

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

type RuntimeEnforcementProfile = {
  pipeline?: string;
  skills?: string[];
};
let runtimeEnforcementByProject: Record<string, RuntimeEnforcementProfile> = {};

const defaultContractRegistry = {
  version: 'agent-system-1.0',
  catalog: [],
  types: [],
};

const CONTROL_ACTION_AUDIT_FILE = path.resolve(process.cwd(), 'docs/runtime/governance/logs/control-actions.jsonl');
const RUN_LEDGER_DIR = path.resolve(process.cwd(), 'docs/process/runs/ledger');

type UnifiedTelemetryEvent = {
  id: string;
  timestamp: number;
  isoTime: string;
  source: 'runtime' | 'audit';
  category: 'run' | 'agent' | 'tool' | 'guard' | 'governance' | 'worker' | 'queue' | 'control' | 'other';
  type: string;
  runId?: string;
  projectId?: string;
  chainId?: string;
  actorId?: string;
  actorType?: string;
  payload: Record<string, any>;
};

const inferTelemetryCategory = (type: string): UnifiedTelemetryEvent['category'] => {
  if (type.startsWith('run.')) return 'run';
  if (type.startsWith('agent.')) return 'agent';
  if (type.startsWith('tool.')) return 'tool';
  if (type.startsWith('guard.')) return 'guard';
  if (type.startsWith('governance.')) return 'governance';
  if (type.startsWith('worker.')) return 'worker';
  if (type.startsWith('task.')) return 'queue';
  if (type.startsWith('control.')) return 'control';
  return 'other';
};

const readControlActionAuditRows = async (projectId?: string): Promise<any[]> => {
  const pgRows = await postgresStore.listAuditActions({
    projectId: projectId || undefined,
    limit: 5000,
  });
  if (pgRows.length > 0) return pgRows;
  if (!fs.existsSync(CONTROL_ACTION_AUDIT_FILE)) return [];
  return fs
    .readFileSync(CONTROL_ACTION_AUDIT_FILE, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((v) => Boolean(v))
    .filter((row: any) => (projectId ? String(row.projectId || '') === projectId : true));
};

const readRunLedgerEvents = async (input: { runId?: string; projectId?: string; limit?: number }): Promise<any[]> => {
  const limit = Math.max(1, Math.min(1000, Number(input.limit || 200)));
  if (input.runId) {
    const runEvents = await fetchEventsByRunId({
      runId: input.runId,
      projectId: input.projectId,
      count: Math.max(2000, limit),
    });
    if (runEvents.length > 0) {
      return runEvents.slice(-limit);
    }
  } else {
    const recent = await fetchRecentEvents(Math.max(2000, limit));
    const filtered = recent
      .filter((row: any) => (input.projectId ? String(row?.projectId || '') === input.projectId : true))
      .sort((a: any, b: any) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
    if (filtered.length > 0) {
      return filtered.slice(-limit);
    }
  }
  if (!fs.existsSync(RUN_LEDGER_DIR)) return [];
  const files = input.runId
    ? [`${input.runId}.jsonl`]
    : fs.readdirSync(RUN_LEDGER_DIR).filter((n) => n.endsWith('.jsonl')).sort().slice(-50);
  const out: any[] = [];
  for (const fileName of files) {
    const filePath = path.join(RUN_LEDGER_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        if (input.projectId && String(ev?.projectId || '') !== input.projectId) continue;
        out.push(ev);
      } catch {
        // ignore malformed lines
      }
    }
  }
  return out.slice(-limit);
};

const normalizeRuntimeEvent = (row: any): UnifiedTelemetryEvent => {
  const ts = Number(row?.timestamp || Date.now());
  const type = String(row?.type || 'runtime.unknown');
  return {
    id: String(row?.id || `runtime-${ts}`),
    timestamp: ts,
    isoTime: new Date(ts).toISOString(),
    source: 'runtime',
    category: inferTelemetryCategory(type),
    type,
    runId: row?.runId ? String(row.runId) : undefined,
    projectId: row?.projectId ? String(row.projectId) : undefined,
    chainId: row?.chainId ? String(row.chainId) : undefined,
    actorId: row?.actor?.id ? String(row.actor.id) : undefined,
    actorType: row?.actor?.type ? String(row.actor.type) : undefined,
    payload: row?.payload && typeof row.payload === 'object' ? row.payload : {},
  };
};

const normalizeAuditRow = (row: any): UnifiedTelemetryEvent => {
  const ts = new Date(String(row?.timestamp || Date.now())).getTime();
  const action = String(row?.action || 'control.unknown');
  const normalizedType = action.startsWith('control.') ? action : `control.${action}`;
  return {
    id: String(row?.id || `audit-${ts}`),
    timestamp: ts,
    isoTime: new Date(ts).toISOString(),
    source: 'audit',
    category: 'control',
    type: normalizedType,
    runId: row?.target?.runId ? String(row.target.runId) : undefined,
    projectId: row?.projectId ? String(row.projectId) : undefined,
    chainId: row?.target?.threadId ? String(row.target.threadId) : undefined,
    actorId: row?.actorId ? String(row.actorId) : undefined,
    actorType: 'system',
    payload: {
      reason: row?.reason || '',
      target: row?.target || {},
      result: row?.result || {},
      rawAction: action,
    },
  };
};

const appendControlActionAudit = (input: {
  action: string;
  projectId?: string;
  actorId?: string;
  reason?: string;
  target?: Record<string, any>;
  result?: Record<string, any>;
}) => {
  try {
    fs.mkdirSync(path.dirname(CONTROL_ACTION_AUDIT_FILE), { recursive: true });
    const row = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action: input.action,
      projectId: input.projectId || null,
      actorId: input.actorId || 'cockpit-user',
      reason: input.reason || '',
      target: input.target || {},
      result: input.result || {},
    };
    fs.appendFileSync(CONTROL_ACTION_AUDIT_FILE, `${JSON.stringify(row)}\n`, 'utf-8');
    void postgresStore.recordAuditAction({
      action: row.action,
      projectId: input.projectId,
      actorId: input.actorId,
      reason: input.reason,
      target: input.target,
      result: input.result,
    });
  } catch {
    // non-blocking audit
  }
};

const appendPolicyMetadata = (input: {
  eventKind: string;
  projectId?: string;
  entityId?: string;
  payload?: Record<string, any>;
}) => {
  void postgresStore.recordPolicyMetadata(input);
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
  CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
`);

const objectStorage = new SqliteObjectStorageService(runtimeDb);
const postgresStore = new PostgresControlPlaneStore();
void postgresStore.init();
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

const AUTH_SESSION_TTL_HOURS = Math.max(1, Number(process.env.AUTH_SESSION_TTL_HOURS || 24));
const AUTH_SECRET = String(process.env.AUTH_SECRET || 'agent-system-dev-secret');
const secretsStore = new SqliteSecretsStore(runtimeDb, AUTH_SECRET);

const hashPassword = (raw: string): string =>
  crypto.createHash('sha256').update(`${AUTH_SECRET}:${String(raw || '')}`).digest('hex');

const parseBearerToken = (headerValue?: string): string => {
  const header = String(headerValue || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
};

const getAuthContext = (req: express.Request): {
  userId: string;
  email: string;
  tenantId: string;
  workspaceId: string;
  role: string;
  token: string;
} | null => {
  const token = parseBearerToken(req.header('authorization'));
  if (!token) return null;
  const row = runtimeDb
    .prepare(
      `SELECT s.token, s.user_id, s.tenant_id, s.workspace_id, s.expires_at, u.email, u.role, u.is_active
       FROM auth_sessions s
       JOIN auth_users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | {
        token: string;
        user_id: string;
        tenant_id: string;
        workspace_id: string;
        expires_at: string;
        email: string;
        role: string;
        is_active: number;
      }
    | undefined;
  if (!row) return null;
  if (!row.is_active) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    runtimeDb.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }
  return {
    userId: row.user_id,
    email: row.email,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    role: row.role,
    token: row.token,
  };
};

type AuthRole = 'owner' | 'admin' | 'member';
const AUTH_ROLE_ORDER: Record<AuthRole, number> = { owner: 3, admin: 2, member: 1 };

const requireRole = (
  req: express.Request,
  res: express.Response,
  minRole: AuthRole,
): { userId: string; email: string; tenantId: string; workspaceId: string; role: string; token: string } | null => {
  const auth = getAuthContext(req);
  if (!auth) {
    res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });
    return null;
  }
  const normalizedRole = (String(auth.role || '').trim().toLowerCase() || 'member') as AuthRole;
  const effectiveRole: AuthRole = normalizedRole === 'owner' || normalizedRole === 'admin' ? normalizedRole : 'member';
  if (AUTH_ROLE_ORDER[effectiveRole] < AUTH_ROLE_ORDER[minRole]) {
    res.status(403).json({ success: false, error: 'forbidden', message: `Requires role: ${minRole}` });
    return null;
  }
  return auth;
};

const canUsePlane = (): boolean => Boolean(PLANE_API_KEY && PLANE_BASE_URL && PLANE_WORKSPACE);

const saveRuntimeState = (key: string, value: unknown) => {
  runtimeDb
    .prepare(
      `INSERT INTO cockpit_state (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), new Date().toISOString());
  void postgresStore.upsertState(key, value);
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
    for (const [section, value] of settingsStore.entries()) {
      void postgresStore.upsertSetting(section, value);
    }
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

const syncExecutorSettingsToRuntimeConfig = (
  executorSettings: Record<string, any>,
  auth?: { tenantId: string; workspaceId: string },
) => {
  try {
    const current = getCockpitExecutorConfig();
    const backend = String(executorSettings.backend || current.backend) as 'claude-cli' | 'codex-cli' | 'openhands-sdk';
    const scopedOpenhandsApiKeys: Record<string, string> = {};
    if (auth?.tenantId && auth?.workspaceId) {
      for (const row of secretsStore.listMeta({ tenantId: auth.tenantId, workspaceId: auth.workspaceId })) {
        if (!row.key.startsWith('openhands.apiKeys.')) continue;
        const provider = row.key.replace('openhands.apiKeys.', '').trim();
        if (!provider) continue;
        const value = secretsStore.getValue({
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          key: row.key,
        });
        if (value) scopedOpenhandsApiKeys[provider] = value;
      }
    }
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
          ...scopedOpenhandsApiKeys,
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
runtimeEnforcementByProject = loadRuntimeState<Record<string, RuntimeEnforcementProfile>>('runtime_enforcement_by_project', {});
void refreshCatalog();
const runtimeFromSettingsAtBoot = getRuntimeSelectionFromExecutorSettings();
if (runtimeFromSettingsAtBoot) {
  runtimeSelection = runtimeFromSettingsAtBoot;
  saveRuntimeState('runtime_selection', runtimeSelection);
}

const parseRuntimeDirectives = (rawMessage: string): {
  cleanedMessage: string;
  requestedPipeline?: string;
  requestedAgents: string[];
  requestedSkills: string[];
} => {
  const lines = String(rawMessage || '').split('\n');
  const keep: string[] = [];
  const requestedAgents: string[] = [];
  const requestedSkills: string[] = [];
  let requestedPipeline: string | undefined;
  for (const line of lines) {
    const trimmed = line.trim();
    const p = trimmed.match(/^pipeline:(.+)$/i);
    if (p?.[1]) {
      requestedPipeline = String(p[1]).trim();
      continue;
    }
    const a = trimmed.match(/^agent:(.+)$/i);
    if (a?.[1]) {
      requestedAgents.push(String(a[1]).trim());
      continue;
    }
    const s = trimmed.match(/^skill:(.+)$/i);
    if (s?.[1]) {
      requestedSkills.push(String(s[1]).trim());
      continue;
    }
    keep.push(line);
  }
  return {
    cleanedMessage: keep.join('\n').trim(),
    ...(requestedPipeline ? { requestedPipeline } : {}),
    requestedAgents: Array.from(new Set(requestedAgents.filter(Boolean))),
    requestedSkills: Array.from(new Set(requestedSkills.filter(Boolean))),
  };
};

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
    const queueDepthByKey = await ProjectDispatchQueue.snapshotAsync(projectId || undefined);
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

app.post('/api/cockpit/swarm/workers/control', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const agentSlug = String(req.body?.agentSlug || '').trim();
    const workerId = String(req.body?.workerId || '').trim();
    const action = String(req.body?.action || '').trim().toLowerCase();

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'project_id_required',
        message: 'projectId is required',
      });
      return;
    }
    if (!agentSlug && !workerId) {
      res.status(400).json({
        success: false,
        error: 'worker_selector_required',
        message: 'agentSlug or workerId is required',
      });
      return;
    }
    if (!['pause', 'resume', 'restart', 'kill'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'invalid_action',
        message: 'action must be one of: pause, resume, restart, kill',
      });
      return;
    }

    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const control = await DynamicWorkerSpawnManager.controlWorker({
      projectId,
      ...(agentSlug ? { agentSlug } : {}),
      ...(workerId ? { workerId } : {}),
      action: action as 'pause' | 'resume' | 'restart' | 'kill',
      runId: `cockpit-control-${Date.now()}`,
      chainId: 'cockpit-worker-control',
    });

    if (!control.ok) {
      const reason = 'reason' in control ? control.reason : 'worker_control_failed';
      res.status(409).json({
        success: false,
        error: 'worker_control_failed',
        message: reason,
      });
      return;
    }

    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({
      projectId,
      heartbeatTimeoutMs: Number(process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000),
    });

    res.json({
      success: true,
      action,
      projectId,
      ...(agentSlug ? { agentSlug } : {}),
      ...(workerId ? { workerId } : {}),
      control,
      workers,
      serverNow: new Date().toISOString(),
    });
    appendControlActionAudit({
      action: `worker_${action}`,
      projectId,
      actorId: 'cockpit-user',
      target: { agentSlug: agentSlug || null, workerId: workerId || null },
      result: { ok: true },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'worker_control_exception',
      message: error?.message || 'Failed to control worker',
    });
  }
});

app.post('/api/cockpit/swarm/workers/bulk', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required', message: 'projectId is required' });
      return;
    }
    if (!['pause_all', 'kill_all', 'restart_group'].includes(action)) {
      res.status(400).json({ success: false, error: 'invalid_action', message: 'action must be pause_all|kill_all|restart_group' });
      return;
    }
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({ projectId });
    const mappedAction =
      action === 'pause_all'
        ? 'pause'
        : action === 'kill_all'
          ? 'kill'
          : 'restart';
    const results: Array<{ workerId: string; agentSlug: string; ok: boolean; reason?: string }> = [];
    for (const worker of workers) {
      const controlled = await DynamicWorkerSpawnManager.controlWorker({
        projectId,
        agentSlug: worker.agentSlug,
        workerId: worker.workerId,
        action: mappedAction as 'pause' | 'kill' | 'restart',
        runId: `bulk-${Date.now()}`,
        chainId: 'cockpit-worker-bulk',
      });
      results.push({
        workerId: worker.workerId,
        agentSlug: worker.agentSlug,
        ok: controlled.ok,
        ...(!controlled.ok ? { reason: controlled.reason } : {}),
      });
    }
    const after = DynamicWorkerSpawnManager.controllerContractSnapshot({ projectId });
    res.json({
      success: true,
      projectId,
      action,
      results,
      workers: after,
      summary: {
        total: results.length,
        ok: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
      serverNow: new Date().toISOString(),
    });
    appendControlActionAudit({
      action: `worker_bulk_${action}`,
      projectId,
      actorId: 'cockpit-user',
      result: { total: results.length, ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'worker_bulk_control_failed',
      message: error?.message || 'Failed to execute bulk worker control',
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
    const queueDepthByKey = await ProjectDispatchQueue.snapshotAsync(projectId || undefined);
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

app.get('/api/cockpit/swarm/performance', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const costDir = path.resolve(process.cwd(), 'docs/process/runs/cost');
    const tokenUsageByAgent: Record<string, number> = {};
    if (fs.existsSync(costDir)) {
      const files = fs
        .readdirSync(costDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .slice(-50);
      for (const name of files) {
        try {
          const row = JSON.parse(fs.readFileSync(path.join(costDir, name), 'utf-8'));
          if (projectId && String(row?.projectId || '') !== projectId) continue;
          const byAgent = row?.attribution?.byAgent || {};
          for (const [agentSlug, tokens] of Object.entries(byAgent)) {
            tokenUsageByAgent[agentSlug] = (tokenUsageByAgent[agentSlug] || 0) + Number(tokens || 0);
          }
        } catch {
          // ignore malformed row
        }
      }
    }

    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { scoreAgentPerformance } = await import('../runtime/performance/AgentPerformanceScoring');
    const rows = DynamicWorkerSpawnManager.utilizationSnapshot({
      projectId: projectId || undefined,
    });
    const scores = rows
      .map((row: any) =>
        scoreAgentPerformance({
          agentSlug: row.agentSlug,
          invocationCount: Number(row.invocationCount || 0),
          successfulTaskCount: Number(row.successfulTaskCount || 0),
          failedTaskCount: Number(row.failedTaskCount || 0),
          retryTaskCount: Number(row.retryTaskCount || 0),
          avgTaskDurationMs: Number(row.avgTaskDurationMs || 0),
          tokenUsage: Number(tokenUsageByAgent[row.agentSlug] || 0),
        }),
      )
      .sort((a: any, b: any) => b.score - a.score);

    res.json({
      success: true,
      projectId: projectId || null,
      rows: scores,
      summary: {
        agents: scores.length,
        avgScore:
          scores.length > 0
            ? Math.round(scores.reduce((acc: number, row: any) => acc + Number(row.score || 0), 0) / scores.length)
            : 0,
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_performance_fetch_failed',
      message: error?.message || 'Failed to fetch swarm performance telemetry',
    });
  }
});

app.get('/api/cockpit/swarm/telemetry/aggregate', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const { scoreAgentPerformance } = await import('../runtime/performance/AgentPerformanceScoring');

    const utilizationRows = DynamicWorkerSpawnManager.utilizationSnapshot({
      projectId: projectId || undefined,
    });
    const queueTasks = await ProjectDispatchQueue.listTasksAsync(projectId || undefined);
    const queueDepthByKey = await ProjectDispatchQueue.snapshotAsync(projectId || undefined);

    const costDir = path.resolve(process.cwd(), 'docs/process/runs/cost');
    const tokenUsageByAgent: Record<string, number> = {};
    let recentCostRows = 0;
    if (fs.existsSync(costDir)) {
      const files = fs.readdirSync(costDir).filter((name) => name.endsWith('.json')).sort().slice(-50);
      for (const name of files) {
        try {
          const row = JSON.parse(fs.readFileSync(path.join(costDir, name), 'utf-8'));
          if (projectId && String(row?.projectId || '') !== projectId) continue;
          recentCostRows += 1;
          const byAgent = row?.attribution?.byAgent || {};
          for (const [agentSlug, tokens] of Object.entries(byAgent)) {
            tokenUsageByAgent[agentSlug] = (tokenUsageByAgent[agentSlug] || 0) + Number(tokens || 0);
          }
        } catch {
          // ignore malformed cost rows
        }
      }
    }

    const performanceRows = utilizationRows
      .map((row: any) =>
        scoreAgentPerformance({
          agentSlug: row.agentSlug,
          invocationCount: Number(row.invocationCount || 0),
          successfulTaskCount: Number(row.successfulTaskCount || 0),
          failedTaskCount: Number(row.failedTaskCount || 0),
          retryTaskCount: Number(row.retryTaskCount || 0),
          avgTaskDurationMs: Number(row.avgTaskDurationMs || 0),
          tokenUsage: Number(tokenUsageByAgent[row.agentSlug] || 0),
        }),
      )
      .sort((a: any, b: any) => b.score - a.score);

    res.json({
      success: true,
      projectId: projectId || null,
      telemetry: {
        utilization: utilizationRows,
        performance: performanceRows,
        queue: {
          totalTasks: queueTasks.length,
          depthByKey: queueDepthByKey,
          tasks: queueTasks,
        },
        costAttribution: {
          recentCostRows,
          tokenUsageByAgent,
        },
      },
      summary: {
        workers: utilizationRows.length,
        agentsScored: performanceRows.length,
        queueTasks: queueTasks.length,
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_telemetry_aggregate_failed',
      message: error?.message || 'Failed to aggregate swarm telemetry',
    });
  }
});

app.get('/api/cockpit/swarm/queue/tasks', async (_req, res) => {
  try {
    const projectId = String(_req.query?.projectId || '').trim();
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const tasks = await ProjectDispatchQueue.listTasksAsync(projectId || undefined);
    res.json({
      success: true,
      projectId: projectId || null,
      tasks,
      total: tasks.length,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'swarm_queue_tasks_fetch_failed',
      message: error?.message || 'Failed to fetch queue tasks',
    });
  }
});

app.post('/api/cockpit/swarm/queue/reassign', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const taskId = String(req.body?.taskId || '').trim();
    const toAgentSlug = String(req.body?.toAgentSlug || '').trim();
    if (!projectId || !taskId || !toAgentSlug) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'projectId, taskId, toAgentSlug are required' });
      return;
    }
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const task = await ProjectDispatchQueue.reassignTaskAsync({ projectId, taskId, toAgentSlug, actorId: 'cockpit-user' });
    if (!task) {
      res.status(404).json({ success: false, error: 'task_not_found', message: 'Queued task not found for reassignment' });
      return;
    }
    res.json({ success: true, task, queueDepthByKey: await ProjectDispatchQueue.snapshotAsync(projectId), serverNow: new Date().toISOString() });
    appendControlActionAudit({
      action: 'queue_reassign',
      projectId,
      actorId: 'cockpit-user',
      target: { taskId, toAgentSlug },
      result: { ok: true },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'swarm_queue_reassign_failed', message: error?.message || 'Failed to reassign queued task' });
  }
});

app.post('/api/cockpit/swarm/queue/retry', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const taskId = String(req.body?.taskId || '').trim();
    if (!projectId || !taskId) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'projectId and taskId are required' });
      return;
    }
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const task = await ProjectDispatchQueue.retryTaskAsync({ projectId, taskId, actorId: 'cockpit-user' });
    if (!task) {
      res.status(404).json({ success: false, error: 'task_not_found', message: 'Task not found for retry' });
      return;
    }
    res.json({ success: true, task, queueDepthByKey: await ProjectDispatchQueue.snapshotAsync(projectId), serverNow: new Date().toISOString() });
    appendControlActionAudit({
      action: 'queue_retry',
      projectId,
      actorId: 'cockpit-user',
      target: { taskId },
      result: { ok: true },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'swarm_queue_retry_failed', message: error?.message || 'Failed to retry queued task' });
  }
});

app.post('/api/cockpit/swarm/queue/cancel', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const taskId = String(req.body?.taskId || '').trim();
    if (!projectId || !taskId) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'projectId and taskId are required' });
      return;
    }
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const task = await ProjectDispatchQueue.cancelTaskAsync({ projectId, taskId, actorId: 'cockpit-user' });
    if (!task) {
      res.status(404).json({ success: false, error: 'task_not_found', message: 'Task not found for cancel' });
      return;
    }
    res.json({ success: true, task, queueDepthByKey: await ProjectDispatchQueue.snapshotAsync(projectId), serverNow: new Date().toISOString() });
    appendControlActionAudit({
      action: 'queue_cancel',
      projectId,
      actorId: 'cockpit-user',
      target: { taskId },
      result: { ok: true },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'swarm_queue_cancel_failed', message: error?.message || 'Failed to cancel queued task' });
  }
});

app.post('/api/cockpit/swarm/queue/priority', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const taskId = String(req.body?.taskId || '').trim();
    const priority = Number(req.body?.priority);
    if (!projectId || !taskId || !Number.isFinite(priority)) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'projectId, taskId, finite priority are required' });
      return;
    }
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const task = await ProjectDispatchQueue.setTaskPriorityAsync({ projectId, taskId, priority, actorId: 'cockpit-user' });
    if (!task) {
      res.status(404).json({ success: false, error: 'task_not_found', message: 'Task not found for priority override' });
      return;
    }
    res.json({ success: true, task, queueDepthByKey: await ProjectDispatchQueue.snapshotAsync(projectId), serverNow: new Date().toISOString() });
    appendControlActionAudit({
      action: 'queue_priority',
      projectId,
      actorId: 'cockpit-user',
      target: { taskId },
      result: { ok: true, priority },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'swarm_queue_priority_failed', message: error?.message || 'Failed to override task priority' });
  }
});

app.post('/api/cockpit/swarm/projects/control', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required', message: 'projectId is required' });
      return;
    }
    if (!['pause_project', 'resume_project', 'clear_queue'].includes(action)) {
      res.status(400).json({ success: false, error: 'invalid_action', message: 'action must be pause_project|resume_project|clear_queue' });
      return;
    }
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    let cleared = 0;
    if (action === 'pause_project') {
      DynamicWorkerSpawnManager.setProjectPaused(projectId, true);
      const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({ projectId });
      for (const worker of workers) {
        await DynamicWorkerSpawnManager.controlWorker({
          projectId,
          agentSlug: worker.agentSlug,
          workerId: worker.workerId,
          action: 'pause',
          runId: `project-control-${Date.now()}`,
          chainId: 'cockpit-project-control',
        }).catch(() => undefined);
      }
    } else if (action === 'resume_project') {
      DynamicWorkerSpawnManager.setProjectPaused(projectId, false);
    } else if (action === 'clear_queue') {
      cleared = await ProjectDispatchQueue.clearProjectAsync(projectId);
    }

    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({ projectId });
    res.json({
      success: true,
      projectId,
      action,
      projectPaused: DynamicWorkerSpawnManager.isProjectPaused(projectId),
      workers,
      queueDepthByKey: await ProjectDispatchQueue.snapshotAsync(projectId),
      ...(action === 'clear_queue' ? { cleared } : {}),
      serverNow: new Date().toISOString(),
    });
    appendControlActionAudit({
      action: `project_${action}`,
      projectId,
      actorId: 'cockpit-user',
      result: { ok: true, cleared },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'project_control_failed',
      message: error?.message || 'Failed to execute project control action',
    });
  }
});

app.get('/api/cockpit/governance/overrides', async (req, res) => {
  try {
    const projectId = String(req.query?.projectId || '').trim();
    const { listManualOverrides } = await import('../runtime/governance/ManualOverrideRegistry');
    const rows = listManualOverrides(process.cwd()).filter((row) => (projectId ? row.projectId === projectId : true));
    res.json({ success: true, overrides: rows, total: rows.length, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_overrides_fetch_failed', message: error?.message || 'Failed to fetch governance overrides' });
  }
});

app.post('/api/cockpit/governance/overrides', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.body?.projectId || '').trim();
    const scope = String(req.body?.scope || '').trim() as 'global' | 'phase' | 'rule';
    const reason = String(req.body?.reason || '').trim();
    const actorId = String(req.body?.actorId || 'cockpit-user').trim();
    const phase = String(req.body?.phase || '').trim();
    const ruleId = String(req.body?.ruleId || '').trim();
    const ticketId = String(req.body?.ticketId || '').trim();
    const expiresAt = String(req.body?.expiresAt || '').trim();
    if (!projectId || !scope || !reason) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'projectId, scope, reason are required' });
      return;
    }
    if (!['global', 'phase', 'rule'].includes(scope)) {
      res.status(400).json({ success: false, error: 'invalid_scope', message: 'scope must be global|phase|rule' });
      return;
    }
    const { addManualOverride } = await import('../runtime/governance/ManualOverrideRegistry');
    const created = addManualOverride(
      {
        projectId,
        scope,
        ...(scope === 'phase' && phase ? { phase: phase as any } : {}),
        ...(scope === 'rule' && ruleId ? { ruleId: ruleId as any } : {}),
        ...(ticketId ? { ticketId } : {}),
        actorId,
        reason,
        ...(expiresAt ? { expiresAt } : {}),
      },
      process.cwd(),
    );
    res.json({ success: true, override: created, serverNow: new Date().toISOString() });
    appendControlActionAudit({
      action: 'governance_override_create',
      projectId,
      actorId,
      reason,
      target: { scope, phase: phase || null, ruleId: ruleId || null, ticketId: ticketId || null },
      result: { ok: true, overrideId: created.id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_override_create_failed', message: error?.message || 'Failed to create governance override' });
  }
});

app.post('/api/cockpit/governance/loops/force', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const loopType = String(req.body?.loopType || '').trim() as 'improvement' | 'validation';
    const loopId = String(req.body?.loopId || '').trim();
    const runId = String(req.body?.runId || '').trim() || `manual-loop-${Date.now().toString(36)}`;
    const projectId = String(req.body?.projectId || '').trim() || 'default';
    const chainId = String(req.body?.chainId || '').trim() || 'manual-loop';
    if (!loopId && !['improvement', 'validation'].includes(loopType)) {
      res.status(400).json({ success: false, error: 'invalid_loop_type', message: 'loopType must be improvement|validation' });
      return;
    }
    let effectiveLoopType: 'improvement' | 'validation' = loopType;
    if (loopId) {
      const { getGovernanceLoopById, isGovernanceLoopRunnable } = await import('../runtime/governance/LoopRegistry');
      const loop = getGovernanceLoopById(loopId, process.cwd());
      if (!loop) {
        res.status(404).json({ success: false, error: 'governance_loop_not_found', message: `Loop not found: ${loopId}` });
        return;
      }
      if (!isGovernanceLoopRunnable(loop, { projectId, chainId })) {
        res.status(403).json({ success: false, error: 'governance_loop_not_runnable', message: `Loop is disabled/out-of-scope: ${loopId}` });
        return;
      }
      effectiveLoopType = loop.kind;
    }
    const workspacePath = process.cwd();
    const {
      generateImprovementSignals,
      aggregateSignals,
      buildImprovementTicketDrafts,
      writeImprovementArtifacts,
      enqueueImprovementJob,
      evaluateLearningTrendKpi,
    } = await import('../runtime/improvement/ImprovementEngine');

    if (effectiveLoopType === 'improvement') {
      const signals = aggregateSignals(
        generateImprovementSignals({ workspacePath, runId, projectId }),
      );
      const tickets = buildImprovementTicketDrafts(signals);
      const artifacts = writeImprovementArtifacts({ workspacePath, runId, signals, tickets });
      const queueJobId = await enqueueImprovementJob({
        runId,
        projectId,
        chainId,
        workspacePath,
        signalsPath: artifacts.signalsPath,
        ticketsPath: artifacts.ticketsPath,
      });
      res.json({
        success: true,
        loopType: effectiveLoopType,
        loopId: loopId || null,
        runId,
        projectId,
        result: { signalsCount: signals.length, ticketsCount: tickets.length, queueJobId, artifacts },
        serverNow: new Date().toISOString(),
      });
      appendControlActionAudit({
        action: 'force_loop_improvement',
        projectId,
        actorId: 'cockpit-user',
        target: { loopId: loopId || null },
        result: { ok: true, runId, signalsCount: signals.length, ticketsCount: tickets.length },
      });
      return;
    }

    const trend = evaluateLearningTrendKpi({ workspacePath, projectId, runId });
    res.json({
      success: true,
      loopType: effectiveLoopType,
      loopId: loopId || null,
      runId,
      projectId,
      result: trend,
      serverNow: new Date().toISOString(),
    });
    appendControlActionAudit({
      action: 'force_loop_validation',
      projectId,
      actorId: 'cockpit-user',
      target: { loopId: loopId || null },
      result: { ok: true, runId, pass: trend.pass, score: trend.score },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_force_loop_failed', message: error?.message || 'Failed to execute forced governance loop' });
  }
});

app.get('/api/governance/loops', async (_req, res) => {
  try {
    const { loadGovernanceLoops } = await import('../runtime/governance/LoopRegistry');
    const loops = loadGovernanceLoops(process.cwd());
    res.json({ success: true, total: loops.length, loops, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_loops_list_failed', message: error?.message || 'Failed to list loops' });
  }
});

app.get('/api/governance/loops/:loopId', async (req, res) => {
  try {
    const loopId = String(req.params?.loopId || '').trim();
    const { getGovernanceLoopById } = await import('../runtime/governance/LoopRegistry');
    const loop = getGovernanceLoopById(loopId, process.cwd());
    if (!loop) {
      res.status(404).json({ success: false, error: 'governance_loop_not_found', message: `Loop not found: ${loopId}` });
      return;
    }
    res.json({ success: true, loop, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_loop_get_failed', message: error?.message || 'Failed to get loop' });
  }
});

app.post('/api/governance/loops', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const payload = req.body || {};
    const id = String(payload.id || '').trim();
    const kind = String(payload.kind || '').trim();
    if (!id || !['improvement', 'validation'].includes(kind)) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'id and kind(improvement|validation) are required' });
      return;
    }
    const { createGovernanceLoop } = await import('../runtime/governance/LoopRegistry');
    const loop = createGovernanceLoop(
      {
        id,
        kind: kind as 'improvement' | 'validation',
        enabledByDefault: payload.enabledByDefault !== false,
        scope: payload.scope || { level: 'global' },
        metadata: payload.metadata || {},
        config: payload.config && typeof payload.config === 'object' ? payload.config : {},
      },
      process.cwd(),
    );
    appendControlActionAudit({
      action: 'governance_loop_create',
      actorId: 'cockpit-user',
      target: { loopId: loop.id, kind: loop.kind },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_loop_create',
      entityId: loop.id,
      payload: { kind: loop.kind, scope: loop.scope || null },
    });
    res.json({ success: true, loop, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_loop_create_failed', message: error?.message || 'Failed to create loop' });
  }
});

app.post('/api/governance/loops/:loopId', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const loopId = String(req.params?.loopId || '').trim();
    const patch = req.body || {};
    const { updateGovernanceLoop } = await import('../runtime/governance/LoopRegistry');
    const loop = updateGovernanceLoop(loopId, patch, process.cwd());
    appendControlActionAudit({
      action: 'governance_loop_update',
      actorId: 'cockpit-user',
      target: { loopId },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_loop_update',
      entityId: loopId,
      payload: { patch },
    });
    res.json({ success: true, loop, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_loop_update_failed', message: error?.message || 'Failed to update loop' });
  }
});

app.post('/api/governance/loops/:loopId/disable', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const loopId = String(req.params?.loopId || '').trim();
    const disabled = req.body?.disabled !== false;
    const { disableGovernanceLoop } = await import('../runtime/governance/LoopRegistry');
    const loop = disableGovernanceLoop(loopId, { disabled }, process.cwd());
    appendControlActionAudit({
      action: 'governance_loop_disable',
      actorId: 'cockpit-user',
      target: { loopId, disabled },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_loop_disable',
      entityId: loopId,
      payload: { disabled },
    });
    res.json({ success: true, loop, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_loop_disable_failed', message: error?.message || 'Failed to disable loop' });
  }
});

app.get('/api/governance/rules', async (req, res) => {
  try {
    const projectId = String(req.query?.projectId || '').trim() || 'default';
    const { loadGovernanceRules } = await import('../runtime/governance/RuleRegistry');
    const { resolveEnabledRules, getProjectPolicy } = await import('../runtime/governance/ProjectPolicyBinding');
    const rules = loadGovernanceRules(process.cwd());
    const enabledSet = resolveEnabledRules(projectId, process.cwd());
    const policy = getProjectPolicy(projectId, process.cwd());
    res.json({
      success: true,
      projectId,
      total: rules.length,
      rules: rules.map((rule: any) => ({
        ...rule,
        effectiveEnabled: !rule.disabled && enabledSet.has(rule.id),
        projectOverride: policy.ruleOverrides?.[rule.id] || null,
      })),
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_rules_list_failed', message: error?.message || 'Failed to list rules' });
  }
});

app.get('/api/governance/rules/:ruleId', async (req, res) => {
  try {
    const projectId = String(req.query?.projectId || '').trim() || 'default';
    const ruleId = String(req.params?.ruleId || '').trim();
    const { getRuleById } = await import('../runtime/governance/RuleRegistry');
    const { resolveEnabledRules, getProjectPolicy } = await import('../runtime/governance/ProjectPolicyBinding');
    const rule = getRuleById(ruleId, process.cwd());
    if (!rule) {
      res.status(404).json({ success: false, error: 'governance_rule_not_found', message: `Rule not found: ${ruleId}` });
      return;
    }
    const enabledSet = resolveEnabledRules(projectId, process.cwd());
    const policy = getProjectPolicy(projectId, process.cwd());
    res.json({
      success: true,
      projectId,
      rule: {
        ...rule,
        effectiveEnabled: !rule.disabled && enabledSet.has(rule.id),
        projectOverride: policy.ruleOverrides?.[rule.id] || null,
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_rule_get_failed', message: error?.message || 'Failed to get rule' });
  }
});

app.post('/api/governance/rules', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const payload = req.body || {};
    const id = String(payload.id || '').trim();
    if (!id) {
      res.status(400).json({ success: false, error: 'rule_id_required', message: 'id is required' });
      return;
    }
    const { createGovernanceRule } = await import('../runtime/governance/RuleRegistry');
    const created = createGovernanceRule(
      {
        id,
        triggerPhases: Array.isArray(payload.triggerPhases) ? payload.triggerPhases : ['AFTER_RUN'],
        evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
        evaluationType: payload.evaluationType || 'deterministic',
        deterministicCheck: payload.deterministicCheck || undefined,
        enforcementMode: payload.enforcementMode || 'soft',
        enabledByDefault: payload.enabledByDefault !== false,
        scope: payload.scope || { level: 'global' },
        thresholds: payload.thresholds || {},
        metadata: payload.metadata || {},
      } as any,
      process.cwd(),
    );
    appendControlActionAudit({
      action: 'governance_rule_create',
      actorId: 'cockpit-user',
      target: { ruleId: created.id },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_rule_create',
      entityId: created.id,
      payload: { triggerPhases: created.triggerPhases || [] },
    });
    res.json({ success: true, rule: created, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_rule_create_failed', message: error?.message || 'Failed to create rule' });
  }
});

app.post('/api/governance/rules/:ruleId', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const ruleId = String(req.params?.ruleId || '').trim();
    const patch = req.body || {};
    const { updateGovernanceRule } = await import('../runtime/governance/RuleRegistry');
    const updated = updateGovernanceRule(ruleId, patch, process.cwd());
    appendControlActionAudit({
      action: 'governance_rule_update',
      actorId: 'cockpit-user',
      target: { ruleId },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_rule_update',
      entityId: ruleId,
      payload: { patch },
    });
    res.json({ success: true, rule: updated, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_rule_update_failed', message: error?.message || 'Failed to update rule' });
  }
});

app.post('/api/governance/rules/:ruleId/disable', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const ruleId = String(req.params?.ruleId || '').trim();
    const projectId = String(req.body?.projectId || '').trim();
    const disabled = req.body?.disabled !== false;
    const { disableGovernanceRule } = await import('../runtime/governance/RuleRegistry');
    const { getProjectPolicy, updateProjectPolicy } = await import('../runtime/governance/ProjectPolicyBinding');
    if (projectId) {
      const policy = getProjectPolicy(projectId, process.cwd());
      const disabledSet = new Set(policy.disabledRules || []);
      if (disabled) disabledSet.add(ruleId);
      else disabledSet.delete(ruleId);
      const updatedPolicy = updateProjectPolicy(
        projectId,
        { disabledRules: Array.from(disabledSet) },
        process.cwd(),
      );
      appendControlActionAudit({
        action: 'governance_rule_disable_project',
        projectId,
        actorId: 'cockpit-user',
        target: { ruleId, disabled },
        result: { ok: true },
      });
      appendPolicyMetadata({
        eventKind: 'governance_rule_disable_project',
        projectId,
        entityId: ruleId,
        payload: { disabled },
      });
      res.json({ success: true, projectId, policy: updatedPolicy, serverNow: new Date().toISOString() });
      return;
    }
    const updated = disableGovernanceRule(ruleId, { disabled }, process.cwd());
    appendControlActionAudit({
      action: 'governance_rule_disable_global',
      actorId: 'cockpit-user',
      target: { ruleId, disabled },
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'governance_rule_disable_global',
      entityId: ruleId,
      payload: { disabled },
    });
    res.json({ success: true, rule: updated, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_rule_disable_failed', message: error?.message || 'Failed to disable rule' });
  }
});

app.delete('/api/governance/rules/:ruleId', async (req, res) => {
  if (!requireRole(req, res, 'owner')) return;
  try {
    const ruleId = String(req.params?.ruleId || '').trim();
    const force = String(req.query?.force || '').trim() === 'true';
    const { deleteGovernanceRule } = await import('../runtime/governance/RuleRegistry');
    const result = deleteGovernanceRule(ruleId, { force }, process.cwd());
    appendControlActionAudit({
      action: 'governance_rule_delete',
      actorId: 'cockpit-user',
      target: { ruleId, force },
      result: { ok: true, ...result },
    });
    appendPolicyMetadata({
      eventKind: 'governance_rule_delete',
      entityId: ruleId,
      payload: { force },
    });
    res.json({ success: true, ruleId, force, ...result, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_rule_delete_failed', message: error?.message || 'Failed to delete rule' });
  }
});

app.get('/api/governance/evaluators', async (_req, res) => {
  try {
    const { listDeterministicEvaluators } = await import('../runtime/governance/DeterministicEvaluationEngine');
    const rows = listDeterministicEvaluators();
    res.json({ success: true, evaluators: rows, total: rows.length, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_evaluators_list_failed', message: error?.message || 'Failed to list evaluators' });
  }
});

app.post('/api/governance/evaluators/register', async (req, res) => {
  if (!requireRole(req, res, 'owner')) return;
  try {
    const evaluatorType = String(req.body?.evaluatorType || '').trim();
    const aliasTo = String(req.body?.aliasTo || '').trim();
    const allowOverrideBuiltin = req.body?.allowOverrideBuiltin === true;
    if (!evaluatorType || !aliasTo) {
      res.status(400).json({ success: false, error: 'invalid_input', message: 'evaluatorType and aliasTo are required' });
      return;
    }
    const { registerDeterministicEvaluator, listDeterministicEvaluators } = await import('../runtime/governance/DeterministicEvaluationEngine');
    const { resolveEvaluator } = await import('../runtime/governance/EvaluatorRegistry');
    listDeterministicEvaluators();
    const base = resolveEvaluator(aliasTo);
    if (!base) {
      res.status(404).json({ success: false, error: 'alias_target_not_found', message: `Base evaluator not found: ${aliasTo}` });
      return;
    }
    registerDeterministicEvaluator({
      evaluatorType,
      evaluate: base,
      source: 'plugin',
      allowOverrideBuiltin,
    } as any);
    const evaluators = listDeterministicEvaluators();
    appendControlActionAudit({
      action: 'governance_evaluator_register',
      actorId: 'cockpit-user',
      target: { evaluatorType, aliasTo },
      result: { ok: true, allowOverrideBuiltin },
    });
    res.json({ success: true, evaluatorType, aliasTo, evaluators, total: evaluators.length, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'governance_evaluator_register_failed', message: error?.message || 'Failed to register evaluator' });
  }
});

app.get('/api/projects/:projectId/policy', async (req, res) => {
  try {
    const projectId = String(req.params?.projectId || '').trim();
    const { getProjectPolicy } = await import('../runtime/governance/ProjectPolicyBinding');
    const policy = getProjectPolicy(projectId, process.cwd());
    res.json({ success: true, policy, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'project_policy_get_failed', message: error?.message || 'Failed to get project policy' });
  }
});

app.get('/api/governance/rules/:ruleId/history', async (req, res) => {
  try {
    const ruleId = String(req.params?.ruleId || '').trim();
    const { listGovernanceRuleHistory } = await import('../runtime/governance/RuleRegistry');
    const history = listGovernanceRuleHistory(ruleId, process.cwd());
    res.json({ success: true, ruleId, history, total: history.length, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_rule_history_failed', message: error?.message || 'Failed to read rule history' });
  }
});

app.post('/api/projects/:projectId/policy', async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  try {
    const projectId = String(req.params?.projectId || '').trim();
    const { updateProjectPolicy } = await import('../runtime/governance/ProjectPolicyBinding');
    const payload = req.body || {};
    const policy = updateProjectPolicy(
      projectId,
      {
        enabledRules: Array.isArray(payload.enabledRules) ? payload.enabledRules : undefined,
        disabledRules: Array.isArray(payload.disabledRules) ? payload.disabledRules : undefined,
        ruleOverrides: payload.ruleOverrides && typeof payload.ruleOverrides === 'object' ? payload.ruleOverrides : undefined,
      },
      process.cwd(),
    );
    appendControlActionAudit({
      action: 'project_policy_update',
      projectId,
      actorId: 'cockpit-user',
      result: { ok: true },
    });
    appendPolicyMetadata({
      eventKind: 'project_policy_update',
      projectId,
      entityId: projectId,
      payload: {
        enabledRules: Array.isArray(payload.enabledRules) ? payload.enabledRules : [],
        disabledRules: Array.isArray(payload.disabledRules) ? payload.disabledRules : [],
      },
    });
    res.json({ success: true, policy, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: 'project_policy_update_failed', message: error?.message || 'Failed to update project policy' });
  }
});

registerTelemetryRoutes(app, {
  fetchRecentEvents,
  readControlActionAuditRows,
  normalizeAuditRow,
  readRunLedgerEvents,
  normalizeRuntimeEvent,
});
registerProviderSettingsRoutes(app, {
  requireRole,
  getAuthContext,
  getRuntimeSelectionFromExecutorSettings,
  isRuntimeProvider,
  providerModelCatalog,
  getRuntimeSelection: () => runtimeSelection,
  setRuntimeSelection: (next) => {
    runtimeSelection = next;
  },
  saveRuntimeState,
  settingsStoreGet: (section) => settingsStore.get(section),
  settingsStoreSet: (section, value) => settingsStore.set(section, value),
  persistSettingsStore,
  syncExecutorSettingsToRuntimeConfig,
  secretsStoreUpsert: (input) => secretsStore.upsert(input),
  getRuntimeEnforcementByProject: () => runtimeEnforcementByProject,
  setRuntimeEnforcementByProject: (next) => {
    runtimeEnforcementByProject = next;
  },
  getRuntimeFooter: () => runtimeFooter,
  setRuntimeFooter: (next) => {
    runtimeFooter = next;
  },
  runExternalExecutor,
});

app.get('/api/cockpit/storage/postgres/health', async (_req, res) => {
  const health = await postgresStore.health();
  res.json({
    success: health.ok,
    backend: 'postgres',
    enabled: health.enabled,
    ...(health.error ? { error: health.error } : {}),
  });
});

registerChainProjectRoutes(app, {
  requireRole,
  canUsePlane,
  fetchPlaneProjects,
  projectStore,
  threadStore,
  threadMessageStore,
  planeBindingStore,
  syncPlaneBindingForProject,
  validateProjectWorktree,
  validateAgentContextPath,
  ensureProject,
  persistRuntimeStore,
  normalizeWorktreePath,
  resolveGitBranch,
  getRuntimeFooter: () => runtimeFooter,
  setRuntimeFooter: (next) => {
    runtimeFooter = next;
  },
  saveRuntimeState,
  refreshCatalog,
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


registerSecretsRoutes(app, {
  requireRole,
  secretsListMeta: (input) => secretsStore.listMeta(input),
  secretsUpsert: (input) => secretsStore.upsert(input),
  secretsDelete: (input) => secretsStore.delete(input),
  appendControlActionAudit,
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const tenantId = String(req.body?.tenantId || '').trim();
  const workspaceId = String(req.body?.workspaceId || '').trim();
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email_and_password_required' });
    return;
  }

  const existingCount = Number((runtimeDb.prepare('SELECT COUNT(*) as c FROM auth_users').get() as any)?.c || 0);
  if (existingCount === 0) {
    const bootstrapTenant = tenantId || process.env.DEFAULT_TENANT_ID || 'tenant:default';
    const bootstrapWorkspace = workspaceId || process.env.DEFAULT_WORKSPACE_ID || 'workspace:default';
    runtimeDb
      .prepare(
        `INSERT INTO auth_users (id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'owner', 1, ?)`,
      )
      .run(`user-${Date.now().toString(36)}`, email, hashPassword(password), bootstrapTenant, bootstrapWorkspace, new Date().toISOString());
  }

  const user = runtimeDb
    .prepare(
      `SELECT id, email, password_hash, tenant_id, workspace_id, role, is_active
       FROM auth_users WHERE email = ?`,
    )
    .get(email) as
    | { id: string; email: string; password_hash: string; tenant_id: string; workspace_id: string; role: string; is_active: number }
    | undefined;

  if (!user || !user.is_active || user.password_hash !== hashPassword(password)) {
    res.status(401).json({ success: false, error: 'invalid_credentials' });
    return;
  }

  const token = `sess_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  runtimeDb
    .prepare(
      `INSERT INTO auth_sessions (token, user_id, tenant_id, workspace_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(token, user.id, user.tenant_id, user.workspace_id, expiresAt, new Date().toISOString());

  res.json({
    success: true,
    token,
    tokenType: 'Bearer',
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      workspaceId: user.workspace_id,
    },
  });
});

app.get('/api/auth/me', (req, res) => {
  const auth = getAuthContext(req);
  if (!auth) {
    res.status(401).json({ success: false, error: 'unauthorized' });
    return;
  }
  res.json({
    success: true,
    user: {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
    },
  });
});

app.post('/api/chat', async (req, res) => {
  const rawMessage = String(req.body?.message || req.body?.prompt || '').trim();
  const threadId = String(req.body?.threadId || `thread_${Date.now()}`).trim();
  const projectId = String(req.body?.projectId || 'default').trim() || 'default';
  const runId = uuidv4();
  const executionMode = String(req.body?.executionMode || 'multiple_agents').trim();
  const mode = executionMode === 'linear' || executionMode === 'mock' ? executionMode : 'multiple_agents';
  const parsed = parseRuntimeDirectives(rawMessage);
  const message = parsed.cleanedMessage || rawMessage;
  const detectedLanguage = detectLanguage(message);
  const auth = getAuthContext(req);

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
        selected_pipeline:
          parsed.requestedPipeline ||
          runtimeEnforcementByProject[projectId]?.pipeline ||
          undefined,
        customAgents:
          parsed.requestedAgents.length > 0
            ? parsed.requestedAgents
            : catalogSnapshot.agents.map((agent) => agent.slug),
        requestedSkills: Array.from(
          new Set([
            ...parsed.requestedSkills,
            ...(runtimeEnforcementByProject[projectId]?.skills || []),
          ]),
        ),
        enforcement: {
          ...(runtimeEnforcementByProject[projectId]?.pipeline
            ? { pipeline: runtimeEnforcementByProject[projectId]?.pipeline }
            : {}),
          ...(Array.isArray(runtimeEnforcementByProject[projectId]?.skills)
            ? { skills: runtimeEnforcementByProject[projectId]?.skills || [] }
            : {}),
        },
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
        auth: auth
          ? {
              userId: auth.userId,
              tenantId: auth.tenantId,
              workspaceId: auth.workspaceId,
              role: auth.role,
            }
          : null,
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

registerAttachmentStorageRoutes(app, {
  objectStorageList: (input) => objectStorage.listObjects(input),
  objectStorageGet: (id) => objectStorage.getObject(id),
  objectStoragePut: (input) => objectStorage.putObject(input),
  appendControlActionAudit,
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
