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
import { PostgresObjectStorageService, SqliteObjectStorageService } from './storage/ObjectStorageService';
import { PostgresSecretsStore, SqliteSecretsStore } from './storage/SecretsStore';
import { SqliteEnvironmentStateStore, buildPersistedEnvironmentId } from './storage/EnvironmentStateStore';
import { EnvironmentProvisioningService } from './storage/EnvironmentProvisioningService';
import { EnvironmentWarmupService, type WarmupCheck } from './storage/EnvironmentWarmupService';
import { EnvironmentSuspendResumeService } from './storage/EnvironmentSuspendResumeService';
import { executeRuntimeRun, resumeRuntimeRun } from '../runtime/graphs/RuntimeExecutionRouter';
import { resolveRuntimeInfrastructureProfile } from '../runtime/infrastructure/RuntimeInfrastructureProfile';
import { fetchRecentEvents, fetchEventsByRunId } from '../runtime/events/EventBus';
import { updateCockpitExecutorConfig, getCockpitExecutorConfig } from '../runtime/CockpitExecutorConfig';
import { DynamicDiscoveryService, AgentRegistry, PipelineRegistry, SkillRegistry } from '../runtime/DynamicDiscoveryService';
import { runExternalExecutor } from '../runtime/ExternalExecutionAdapter';
import { registerTelemetryRoutes } from './routes/telemetryRoutes';
import { registerProviderSettingsRoutes } from './routes/providerSettingsRoutes';
import { registerChainProjectRoutes } from './routes/chainProjectRoutes';
import { registerSecretsRoutes } from './routes/secretsRoutes';
import { registerAttachmentStorageRoutes } from './routes/attachmentStorageRoutes';
import { registerBillingRoutes } from './routes/billingRoutes';
import { loadServiceRegistry } from '../runtime/control-plane/ServiceRegistryLoader';
import { LocalProcessAdapter } from '../runtime/control-plane/LocalProcessAdapter';
import { DockerAdapter } from '../runtime/control-plane/DockerAdapter';
import { ServiceExecutionAdapterRegistry } from '../runtime/control-plane/adapters/ServiceExecutionAdapter';
import { ControlPlaneRuntimeManager } from '../runtime/control-plane/ControlPlaneRuntimeManager';
import { registerControlPlaneRoutes } from './routes/controlPlaneRoutes';
import { ServiceLifecycleEventBus } from '../runtime/control-plane/ServiceLifecycleEvents';
import { BillingService } from '../runtime/billing/BillingService';
import { BillingPaymentService } from '../runtime/billing/BillingPaymentService';
import { StripeMvpProvider } from '../runtime/billing/PaymentProvider';

dotenv.config();

const PORT = Number(process.env.AGENT_SYSTEM_BACKEND_PORT || process.env.PORT || '3001');
const HOST = process.env.AGENT_SYSTEM_BACKEND_HOST || '127.0.0.1';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const controlPlaneRegistrySource = path.resolve(process.cwd(), 'config/control-plane/service-registry.yaml');
const loadedControlPlaneRegistry = loadServiceRegistry(controlPlaneRegistrySource).registry;
const controlPlaneAdapterRegistry = new ServiceExecutionAdapterRegistry();
const controlPlaneEventBus = new ServiceLifecycleEventBus();
controlPlaneAdapterRegistry.register(new LocalProcessAdapter());
controlPlaneAdapterRegistry.register(new DockerAdapter());
const controlPlaneRuntimeManager = new ControlPlaneRuntimeManager(loadedControlPlaneRegistry, controlPlaneAdapterRegistry, controlPlaneEventBus);
const billingService = new BillingService();
const billingPaymentService = new BillingPaymentService(new StripeMvpProvider());

process.on('uncaughtException', (error) => {
  console.error('[agent-system-backend] uncaughtException:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[agent-system-backend] unhandledRejection:', reason);
});

const settingsStore = new Map<string, unknown>();
const projectStore = new Map<string, {
  id: string;
  label: string;
  worktreePath?: string;
  agentContextPath?: string;
  repositoryUrl?: string;
  onboardingMode?: 'local' | 'repository';
  onboardingAuthMode?: 'none' | 'oauth' | 'pat';
  onboardingBootstrapMode?: 'none' | 'auto-template' | 'read-only';
  onboardingReadOnly?: boolean;
}>();
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
type ControlPlaneSource = 'postgres' | 'sqlite' | 'default';

const isRuntimeProvider = (value: string): value is RuntimeProvider => value in providerModelCatalog;

const CONTROL_PLANE_STATE_KEYS = [
  'runtime_footer',
  'runtime_selection',
  'runtime_enforcement_by_project',
] as const;
type ControlPlaneStateKey = typeof CONTROL_PLANE_STATE_KEYS[number];

const controlPlaneSourceState: {
  settings: ControlPlaneSource;
  runtimeState: Record<ControlPlaneStateKey, ControlPlaneSource>;
  postgres: { enabled: boolean; ok: boolean; error?: string };
  lastHydratedAt?: string;
} = {
  settings: 'default',
  runtimeState: {
    runtime_footer: 'default',
    runtime_selection: 'default',
    runtime_enforcement_by_project: 'default',
  },
  postgres: { enabled: false, ok: false },
};

const markRuntimeStateSource = (key: ControlPlaneStateKey, source: ControlPlaneSource) => {
  controlPlaneSourceState.runtimeState[key] = source;
};

const getRuntimeSelectionFromExecutorSettings = (): { provider: RuntimeProvider; model: string } | null => {
  const raw = settingsStore.get('executor');
  if (!raw || typeof raw !== 'object') return null;
  const executor = raw as {
    provider?: string;
    model?: string;
    backend?: string;
    claude?: { model?: string };
    codex?: { model?: string };
    openhands?: { model?: string };
  };
  const providerCandidate = String(executor.provider || executor.backend || '').trim();
  if (!providerCandidate || !isRuntimeProvider(providerCandidate)) return null;
  const provider = providerCandidate;
  const modelFromSettings =
    executor.model ||
    (provider === 'claude-cli'
      ? executor.claude?.model
      : provider === 'codex-cli'
        ? executor.codex?.model
        : executor.openhands?.model);
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
  void postgresStore.recordAuditAction({
    action: row.action,
    projectId: input.projectId,
    actorId: input.actorId,
    reason: input.reason,
    target: input.target,
    result: input.result,
  });

  const fsMirrorMode = String(process.env.RUNTIME_AUDIT_FS_MIRROR || '').trim().toLowerCase();
  const shouldMirrorToFs =
    fsMirrorMode === 'always' ||
    (fsMirrorMode !== 'never' && !postgresStore.isEnabled());

  if (!shouldMirrorToFs) {
    return;
  }
  try {
    fs.mkdirSync(path.dirname(CONTROL_ACTION_AUDIT_FILE), { recursive: true });
    fs.appendFileSync(CONTROL_ACTION_AUDIT_FILE, `${JSON.stringify(row)}\n`, 'utf-8');
  } catch {
    // non-blocking audit mirror
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
    agent_context_path TEXT,
    repository_url TEXT,
    onboarding_mode TEXT,
    onboarding_auth_mode TEXT,
    onboarding_bootstrap_mode TEXT,
    onboarding_read_only INTEGER
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
    refresh_token_hash TEXT,
    revoked_at TEXT,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
  CREATE TABLE IF NOT EXISTS auth_sso_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL,
    issuer TEXT,
    entrypoint TEXT,
    audience TEXT,
    tenant_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    client_id TEXT,
    client_secret_hash TEXT,
    scim_token_hash TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_auth_sso_providers_scope ON auth_sso_providers(tenant_id, workspace_id, protocol);
`);

const objectStorage = new SqliteObjectStorageService(runtimeDb);
const postgresObjectStorage = new PostgresObjectStorageService();
const postgresStore = new PostgresControlPlaneStore();
void postgresStore.init();
const environmentStateStore = new SqliteEnvironmentStateStore(runtimeDb);
const environmentProvisioningService = new EnvironmentProvisioningService(environmentStateStore);
const environmentWarmupService = new EnvironmentWarmupService(environmentStateStore);
const environmentSuspendResumeService = new EnvironmentSuspendResumeService(environmentStateStore);
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN agent_context_path TEXT`);
} catch {
  // Column already exists on upgraded instances.
}
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN repository_url TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN onboarding_mode TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN onboarding_auth_mode TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN onboarding_bootstrap_mode TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE cockpit_projects ADD COLUMN onboarding_read_only INTEGER`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE auth_sessions ADD COLUMN refresh_token_hash TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE auth_sessions ADD COLUMN revoked_at TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE auth_sessions ADD COLUMN user_agent TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE auth_sessions ADD COLUMN ip_address TEXT`);
} catch {}
try {
  runtimeDb.exec(`ALTER TABLE auth_sso_providers ADD COLUMN scim_token_hash TEXT`);
} catch {}

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
const AUTH_MODE = String(process.env.AUTH_MODE || 'optional').trim().toLowerCase() === 'required' ? 'required' : 'optional';
const secretsStore = new SqliteSecretsStore(runtimeDb, AUTH_SECRET);
const postgresSecretsStore = new PostgresSecretsStore(AUTH_SECRET);
const infrastructureProfile = resolveRuntimeInfrastructureProfile();

const hashPassword = (raw: string): string =>
  crypto.createHash('sha256').update(`${AUTH_SECRET}:${String(raw || '')}`).digest('hex');

const hashRefreshToken = (raw: string): string =>
  crypto.createHash('sha256').update(`${AUTH_SECRET}:refresh:${String(raw || '')}`).digest('hex');

const createSessionToken = (prefix: 'sess' | 'refresh'): string =>
  `${prefix}_${crypto.randomUUID()}_${crypto.randomBytes(12).toString('hex')}`;

const createAuthSession = (input: {
  userId: string;
  tenantId: string;
  workspaceId: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  const token = createSessionToken('sess');
  const refreshToken = createSessionToken('refresh');
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  runtimeDb
    .prepare(
      `INSERT INTO auth_sessions (
        token,
        user_id,
        tenant_id,
        workspace_id,
        refresh_token_hash,
        expires_at,
        created_at,
        user_agent,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      token,
      input.userId,
      input.tenantId,
      input.workspaceId,
      refreshTokenHash,
      expiresAt,
      new Date().toISOString(),
      String(input.userAgent || '').slice(0, 512),
      String(input.ipAddress || '').slice(0, 128),
    );
  return { token, refreshToken, expiresAt };
};

const parseScimBearerToken = (req: express.Request): string => {
  const header = String(req.header('authorization') || '').trim();
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
};

const shouldUsePostgresSecrets = async (): Promise<boolean> => {
  if (infrastructureProfile.secretsBackend !== 'postgres') return false;
  return postgresSecretsStore.ready();
};

const shouldUsePostgresObjects = async (): Promise<boolean> => {
  if (infrastructureProfile.objectStorageBackend !== 'postgres') return false;
  return postgresObjectStorage.ready();
};

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
      `SELECT s.token, s.user_id, s.tenant_id, s.workspace_id, s.expires_at, s.revoked_at, u.email, u.role, u.is_active
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
        revoked_at: string | null;
        email: string;
        role: string;
        is_active: number;
      }
    | undefined;
  if (!row) return null;
  if (!row.is_active) return null;
  if (row.revoked_at) {
    runtimeDb.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }
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

type AuthRole = 'owner' | 'admin' | 'member' | 'viewer';
const AUTH_ROLE_ORDER: Record<AuthRole, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
const AUTH_PERMISSION_MATRIX: Record<AuthRole, string[]> = {
  owner: ['*'],
  admin: ['runtime:read', 'runtime:write', 'config:read', 'config:write', 'secrets:read', 'secrets:write'],
  member: ['runtime:read', 'runtime:write', 'config:read'],
  viewer: ['runtime:read', 'config:read'],
};

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
  const effectiveRole: AuthRole =
    normalizedRole === 'owner' || normalizedRole === 'admin' || normalizedRole === 'member' || normalizedRole === 'viewer'
      ? normalizedRole
      : 'member';
  if (AUTH_ROLE_ORDER[effectiveRole] < AUTH_ROLE_ORDER[minRole]) {
    res.status(403).json({ success: false, error: 'forbidden', message: `Requires role: ${minRole}` });
    return null;
  }
  return auth;
};

const requireAuthForRuntimeIfEnabled = (
  req: express.Request,
  res: express.Response,
): { userId: string; email: string; tenantId: string; workspaceId: string; role: string; token: string } | null => {
  const auth = getAuthContext(req);
  if (AUTH_MODE === 'required' && !auth) {
    res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required (AUTH_MODE=required)' });
    return null;
  }
  return auth;
};

const resolveWorkspaceRuntimeContext = (input: {
  projectId: string;
  auth: { userId: string; email: string; tenantId: string; workspaceId: string; role: string; token: string } | null;
  requestedTenantId?: string;
  requestedWorkspaceId?: string;
}): { tenantId: string; workspaceId: string; userId?: string } | { error: string; message: string; status: number } => {
  const requestedTenantId = String(input.requestedTenantId || '').trim();
  const requestedWorkspaceId = String(input.requestedWorkspaceId || '').trim();
  const defaultTenant = process.env.DEFAULT_TENANT_ID || `tenant:${input.projectId}`;
  const defaultWorkspace = process.env.DEFAULT_WORKSPACE_ID || `workspace:${input.projectId}`;

  const tenantId = requestedTenantId || input.auth?.tenantId || defaultTenant;
  const workspaceId = requestedWorkspaceId || input.auth?.workspaceId || defaultWorkspace;

  if (!tenantId || !workspaceId) {
    return {
      error: 'workspace_context_required',
      message: 'Cannot resolve tenant/workspace context for runtime request',
      status: 400,
    };
  }
  if (input.auth?.tenantId && tenantId !== input.auth.tenantId) {
    return {
      error: 'tenant_context_mismatch',
      message: 'Requested tenant does not match authenticated tenant',
      status: 403,
    };
  }
  if (input.auth?.workspaceId && workspaceId !== input.auth.workspaceId) {
    return {
      error: 'workspace_context_mismatch',
      message: 'Requested workspace does not match authenticated workspace',
      status: 403,
    };
  }
  return {
    tenantId,
    workspaceId,
    ...(input.auth?.userId ? { userId: input.auth.userId } : {}),
  };
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

const loadRuntimeState = <T>(key: string, defaultValue: T): T => {
  const row = runtimeDb
    .prepare('SELECT value_json FROM cockpit_state WHERE key = ?')
    .get(key) as { value_json?: string } | undefined;
  if (!row?.value_json) {
    if ((CONTROL_PLANE_STATE_KEYS as readonly string[]).includes(key)) {
      markRuntimeStateSource(key as ControlPlaneStateKey, 'default');
    }
    return defaultValue;
  }
  try {
    const value = JSON.parse(row.value_json) as T;
    if ((CONTROL_PLANE_STATE_KEYS as readonly string[]).includes(key)) {
      markRuntimeStateSource(key as ControlPlaneStateKey, 'sqlite');
    }
    return value;
  } catch {
    if ((CONTROL_PLANE_STATE_KEYS as readonly string[]).includes(key)) {
      markRuntimeStateSource(key as ControlPlaneStateKey, 'default');
    }
    return defaultValue;
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
      controlPlaneSourceState.settings = 'sqlite';
      return;
    }

    // One-time migration from legacy JSON settings file.
    if (!fs.existsSync(SETTINGS_LEGACY_FILE_PATH)) return;
    const raw = fs.readFileSync(SETTINGS_LEGACY_FILE_PATH, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    Object.entries(parsed).forEach(([key, value]) => settingsStore.set(key, value));
    persistSettingsStore();
    controlPlaneSourceState.settings = 'default';
  } catch (error) {
    console.error('[agent-system-backend] failed to restore settings store:', error);
  }
};

const hydrateControlPlaneFromPostgres = async () => {
  const health = await postgresStore.health();
  controlPlaneSourceState.postgres = {
    enabled: health.enabled,
    ok: health.ok,
    ...(health.error ? { error: health.error } : {}),
  };
  if (!health.ok) return;

  try {
    const settingsRows = await postgresStore.listSettings();
    if (settingsRows.length > 0) {
      settingsStore.clear();
      for (const row of settingsRows) {
        if (!row.section) continue;
        settingsStore.set(row.section, row.value);
      }
      controlPlaneSourceState.settings = 'postgres';
      persistSettingsStore();
    }

    const footer = await postgresStore.getState('runtime_footer');
    if (footer && footer.value && typeof footer.value === 'object') {
      runtimeFooter = {
        ...runtimeFooter,
        ...(footer.value as Record<string, any>),
      };
      markRuntimeStateSource('runtime_footer', 'postgres');
      saveRuntimeState('runtime_footer', runtimeFooter);
    }

    const selection = await postgresStore.getState('runtime_selection');
    if (selection && selection.value && typeof selection.value === 'object') {
      const candidate = selection.value as { provider?: string; model?: string };
      const provider = String(candidate.provider || '').trim();
      const model = String(candidate.model || '').trim();
      if (isRuntimeProvider(provider) && model) {
        runtimeSelection = { provider, model };
        markRuntimeStateSource('runtime_selection', 'postgres');
        saveRuntimeState('runtime_selection', runtimeSelection);
      }
    }

    const enforcement = await postgresStore.getState('runtime_enforcement_by_project');
    if (enforcement && enforcement.value && typeof enforcement.value === 'object') {
      runtimeEnforcementByProject = enforcement.value as Record<string, RuntimeEnforcementProfile>;
      markRuntimeStateSource('runtime_enforcement_by_project', 'postgres');
      saveRuntimeState('runtime_enforcement_by_project', runtimeEnforcementByProject);
    }

    controlPlaneSourceState.lastHydratedAt = new Date().toISOString();
  } catch (error: any) {
    controlPlaneSourceState.postgres = {
      ...controlPlaneSourceState.postgres,
      ok: false,
      error: String(error?.message || 'postgres_hydration_failed'),
    };
  }
};

const persistRuntimeStore = () => {
  try {
    const tx = runtimeDb.transaction(() => {
      runtimeDb.prepare('DELETE FROM cockpit_projects').run();
      runtimeDb.prepare('DELETE FROM cockpit_threads').run();
      runtimeDb.prepare('DELETE FROM cockpit_messages').run();

      const insertProject = runtimeDb.prepare(
        `INSERT INTO cockpit_projects (
          id,
          label,
          worktree_path,
          agent_context_path,
          repository_url,
          onboarding_mode,
          onboarding_auth_mode,
          onboarding_bootstrap_mode,
          onboarding_read_only
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      const insertThread = runtimeDb.prepare(
        'INSERT INTO cockpit_threads (id, project_id, label, updated_at) VALUES (?, ?, ?, ?)',
      );
      const insertMessage = runtimeDb.prepare(
        'INSERT INTO cockpit_messages (id, thread_id, role, content, timestamp, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      );

      for (const project of projectStore.values()) {
        insertProject.run(
          project.id,
          project.label,
          project.worktreePath || null,
          project.agentContextPath || null,
          project.repositoryUrl || null,
          project.onboardingMode || null,
          project.onboardingAuthMode || null,
          project.onboardingBootstrapMode || null,
          project.onboardingReadOnly ? 1 : 0,
        );
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
      `SELECT
        id,
        label,
        worktree_path,
        agent_context_path,
        repository_url,
        onboarding_mode,
        onboarding_auth_mode,
        onboarding_bootstrap_mode,
        onboarding_read_only
      FROM cockpit_projects ORDER BY id`,
    ).all() as Array<{
      id: string;
      label: string;
      worktree_path: string | null;
      agent_context_path: string | null;
      repository_url: string | null;
      onboarding_mode: string | null;
      onboarding_auth_mode: string | null;
      onboarding_bootstrap_mode: string | null;
      onboarding_read_only: number | null;
    }>;
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
        ...(project.repository_url ? { repositoryUrl: project.repository_url } : {}),
        ...(project.onboarding_mode ? { onboardingMode: project.onboarding_mode as 'local' | 'repository' } : {}),
        ...(project.onboarding_auth_mode ? { onboardingAuthMode: project.onboarding_auth_mode as 'none' | 'oauth' | 'pat' } : {}),
        ...(project.onboarding_bootstrap_mode ? { onboardingBootstrapMode: project.onboarding_bootstrap_mode as 'none' | 'auto-template' | 'read-only' } : {}),
        ...(project.onboarding_read_only !== null ? { onboardingReadOnly: Boolean(project.onboarding_read_only) } : {}),
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
          projects?: Array<{
            id: string;
            label: string;
            worktreePath?: string;
            agentContextPath?: string;
            repositoryUrl?: string;
            onboardingMode?: 'local' | 'repository';
            onboardingAuthMode?: 'none' | 'oauth' | 'pat';
            onboardingBootstrapMode?: 'none' | 'auto-template' | 'read-only';
            onboardingReadOnly?: boolean;
          }>;
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
            ...(project.repositoryUrl ? { repositoryUrl: project.repositoryUrl } : {}),
            ...(project.onboardingMode ? { onboardingMode: project.onboardingMode } : {}),
            ...(project.onboardingAuthMode ? { onboardingAuthMode: project.onboardingAuthMode } : {}),
            ...(project.onboardingBootstrapMode ? { onboardingBootstrapMode: project.onboardingBootstrapMode } : {}),
            ...(typeof project.onboardingReadOnly === 'boolean' ? { onboardingReadOnly: project.onboardingReadOnly } : {}),
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
      // ignore fs errors and use default below
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
  markRuntimeStateSource('runtime_selection', controlPlaneSourceState.settings);
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
    controlPlane: {
      sourceOfTruth: 'postgres',
      settingsSource: controlPlaneSourceState.settings,
      runtimeStateSources: controlPlaneSourceState.runtimeState,
      default: {
        enabled: true,
        store: 'sqlite',
      },
      postgres: controlPlaneSourceState.postgres,
      ...(controlPlaneSourceState.lastHydratedAt ? { lastHydratedAt: controlPlaneSourceState.lastHydratedAt } : {}),
    },
    storage: {
      objectStorageBackend: OBJECT_STORAGE_BACKEND || 'sqlite',
      secretsBackend: SECRETS_STORAGE_BACKEND || 'sqlite',
      defaultStore: 'sqlite',
    },
    auth: {
      mode: AUTH_MODE,
      sessionTtlHours: AUTH_SESSION_TTL_HOURS,
    },
  });
});

app.get('/api/cockpit/runtime/infrastructure-profile', (_req, res) => {
  res.json({
    success: true,
    profile: resolveRuntimeInfrastructureProfile(),
    serverNow: new Date().toISOString(),
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

app.use('/api/cockpit/swarm', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'swarm_client_api_removed',
    message: 'Swarm client API is disabled. Use /api/system/control-plane/* endpoints.',
  });
});

app.get('/api/governance/overrides', async (req, res) => {
  try {
    const projectId = String(req.query?.projectId || '').trim();
    const { listManualOverrides } = await import('../runtime/governance/ManualOverrideRegistry');
    const rows = listManualOverrides(process.cwd()).filter((row) => (projectId ? row.projectId === projectId : true));
    res.json({ success: true, overrides: rows, total: rows.length, serverNow: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'governance_overrides_fetch_failed', message: error?.message || 'Failed to fetch governance overrides' });
  }
});

app.post('/api/governance/overrides', async (req, res) => {
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

app.post('/api/governance/loops/force', async (req, res) => {
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
      environmentStateStore.upsert({
        environmentId,
        tenantId: workspaceContext.tenantId,
        workspaceId: workspaceContext.workspaceId,
        projectId,
        state: 'idle',
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

app.get('/api/governance/profiles', async (req, res) => {
  try {
    const raw = String(req.query?.projectId || req.query?.projectIds || '').trim();
    const projectIds = raw
      ? raw.split(',').map((value) => value.trim()).filter(Boolean)
      : ['default'];
    const { buildGovernanceDataModelSnapshot } = await import('../runtime/governance/GovernanceDataModel');
    const snapshot = buildGovernanceDataModelSnapshot({ workspacePath: process.cwd(), projectIds });
    res.json({
      success: true,
      total: snapshot.profiles.length,
      profiles: snapshot.profiles,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'governance_profiles_list_failed',
      message: error?.message || 'Failed to list governance profiles',
    });
  }
});

app.get('/api/governance/artifacts', async (_req, res) => {
  try {
    const { buildGovernanceDataModelSnapshot } = await import('../runtime/governance/GovernanceDataModel');
    const snapshot = buildGovernanceDataModelSnapshot({ workspacePath: process.cwd() });
    res.json({
      success: true,
      total: snapshot.artifacts.length,
      artifacts: snapshot.artifacts,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'governance_artifacts_list_failed',
      message: error?.message || 'Failed to list governance artifacts',
    });
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

app.patch('/api/governance/loops/:loopId', async (req, res) => {
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
      result: { ok: true, method: 'patch' },
    });
    appendPolicyMetadata({
      eventKind: 'governance_loop_update',
      entityId: loopId,
      payload: { patch, method: 'patch' },
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

app.patch('/api/governance/rules/:ruleId', async (req, res) => {
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
      result: { ok: true, method: 'patch' },
    });
    appendPolicyMetadata({
      eventKind: 'governance_rule_update',
      entityId: ruleId,
      payload: { patch, method: 'patch' },
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

app.get('/api/governance/projects/:projectId/policy', async (req, res) => {
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

app.post('/api/governance/projects/:projectId/policy', async (req, res) => {
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
        executionProfile:
          payload.executionProfile === 'engineering' || payload.executionProfile === 'non_engineering'
            ? payload.executionProfile
            : undefined,
        gitPolicy: payload.gitPolicy && typeof payload.gitPolicy === 'object' ? payload.gitPolicy : undefined,
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

registerControlPlaneRoutes(app, {
  requireRole,
  manager: controlPlaneRuntimeManager,
  appendControlActionAudit,
});

registerBillingRoutes(app, {
  requireRole,
  billingService,
  paymentService: billingPaymentService,
});

app.get('/api/cockpit/storage/postgres/health', async (_req, res) => {
  const health = await postgresStore.health();
  controlPlaneSourceState.postgres = {
    enabled: health.enabled,
    ok: health.ok,
    ...(health.error ? { error: health.error } : {}),
  };
  res.json({
    success: health.ok,
    backend: 'postgres',
    enabled: health.enabled,
    sourceOfTruth: 'postgres',
    defaultStore: 'sqlite',
    settingsSource: controlPlaneSourceState.settings,
    runtimeStateSources: controlPlaneSourceState.runtimeState,
    ...(controlPlaneSourceState.lastHydratedAt ? { lastHydratedAt: controlPlaneSourceState.lastHydratedAt } : {}),
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
  secretsListMeta: async (input) => {
    if (await shouldUsePostgresSecrets()) {
      const pgRows = await postgresSecretsStore.listMeta(input);
      if (pgRows.length > 0) return pgRows;
    }
    return secretsStore.listMeta(input);
  },
  secretsUpsert: async (input) => {
    const sqliteSaved = secretsStore.upsert(input);
    if (await shouldUsePostgresSecrets()) {
      try {
        await postgresSecretsStore.upsert(input);
      } catch {
        // sqlite mirror already persisted; keep response deterministic
      }
    }
    return sqliteSaved;
  },
  secretsDelete: async (input) => {
    const sqliteDeleted = secretsStore.delete(input);
    if (await shouldUsePostgresSecrets()) {
      try {
        await postgresSecretsStore.delete(input);
      } catch {
        // keep sqlite deletion result
      }
    }
    return sqliteDeleted;
  },
  appendControlActionAudit,
});

app.post('/api/auth/register', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const tenantId = String(req.body?.tenantId || '').trim();
  const workspaceId = String(req.body?.workspaceId || '').trim();
  const requestedRole = String(req.body?.role || '').trim().toLowerCase();

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email_and_password_required' });
    return;
  }
  if (!tenantId || !workspaceId) {
    res.status(400).json({ success: false, error: 'tenant_and_workspace_required' });
    return;
  }

  const existingByEmail = runtimeDb
    .prepare(`SELECT id FROM auth_users WHERE email = ?`)
    .get(email) as { id: string } | undefined;
  if (existingByEmail?.id) {
    res.status(409).json({ success: false, error: 'user_already_exists' });
    return;
  }

  const existingCount = Number((runtimeDb.prepare('SELECT COUNT(*) as c FROM auth_users').get() as any)?.c || 0);
  const role = requestedRole === 'admin' || requestedRole === 'owner' || requestedRole === 'member' || requestedRole === 'viewer'
    ? requestedRole
    : existingCount === 0
      ? 'owner'
      : 'member';

  const userId = `user-${crypto.randomUUID()}`;
  runtimeDb
    .prepare(
      `INSERT INTO auth_users (id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(userId, email, hashPassword(password), tenantId, workspaceId, role, new Date().toISOString());

  res.status(201).json({
    success: true,
    user: {
      id: userId,
      email,
      role,
      tenantId,
      workspaceId,
    },
  });
});

app.get('/api/auth/rbac/matrix', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  res.json({
    success: true,
    roles: Object.keys(AUTH_PERMISSION_MATRIX),
    matrix: AUTH_PERMISSION_MATRIX,
  });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email_and_password_required' });
    return;
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

  const { token, refreshToken, expiresAt } = createAuthSession({
    userId: user.id,
    tenantId: user.tenant_id,
    workspaceId: user.workspace_id,
    userAgent: req.header('user-agent') || '',
    ipAddress: req.ip || '',
  });

  res.json({
    success: true,
    token,
    refreshToken,
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

app.get('/api/auth/sso/providers', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const items = runtimeDb
    .prepare(
      `SELECT id, name, protocol, issuer, entrypoint, audience, tenant_id, workspace_id, client_id, active, created_at, updated_at
       FROM auth_sso_providers
       WHERE tenant_id = ? AND workspace_id = ?
       ORDER BY protocol ASC, name ASC`,
    )
    .all(auth.tenantId, auth.workspaceId);
  res.json({ success: true, items });
});

app.post('/api/auth/sso/providers', (req, res) => {
  const auth = requireRole(req, res, 'admin');
  if (!auth) return;
  const name = String(req.body?.name || '').trim();
  const protocolRaw = String(req.body?.protocol || '').trim().toLowerCase();
  const protocol = protocolRaw === 'oidc' || protocolRaw === 'saml' ? protocolRaw : '';
  const issuer = String(req.body?.issuer || '').trim();
  const entrypoint = String(req.body?.entrypoint || '').trim();
  const audience = String(req.body?.audience || '').trim();
  const clientId = String(req.body?.clientId || '').trim();
  const clientSecret = String(req.body?.clientSecret || '').trim();
  const scimToken = String(req.body?.scimToken || '').trim();
  if (!name || !protocol) {
    res.status(400).json({ success: false, error: 'name_and_valid_protocol_required' });
    return;
  }

  const id = `sso_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  runtimeDb
    .prepare(
      `INSERT INTO auth_sso_providers (
        id, name, protocol, issuer, entrypoint, audience, tenant_id, workspace_id, client_id, client_secret_hash, scim_token_hash, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      id,
      name,
      protocol,
      issuer || null,
      entrypoint || null,
      audience || null,
      auth.tenantId,
      auth.workspaceId,
      clientId || null,
      clientSecret ? hashPassword(clientSecret) : null,
      scimToken ? hashPassword(`scim:${scimToken}`) : null,
      now,
      now,
    );
  res.status(201).json({
    success: true,
    provider: {
      id,
      name,
      protocol,
      issuer: issuer || null,
      entrypoint: entrypoint || null,
      audience: audience || null,
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      clientId: clientId || null,
      active: true,
    },
  });
});

const requireScimProvider = (req: express.Request, res: express.Response): {
  providerId: string;
  tenantId: string;
  workspaceId: string;
  protocol: string;
} | null => {
  const providerId = String(req.header('x-scim-provider-id') || req.query?.providerId || req.body?.providerId || '').trim();
  const token = parseScimBearerToken(req);
  if (!providerId || !token) {
    res.status(401).json({ success: false, error: 'scim_provider_and_token_required' });
    return null;
  }
  const row = runtimeDb
    .prepare(
      `SELECT id, tenant_id, workspace_id, protocol, active, scim_token_hash
       FROM auth_sso_providers WHERE id = ?`,
    )
    .get(providerId) as
    | { id: string; tenant_id: string; workspace_id: string; protocol: string; active: number; scim_token_hash: string | null }
    | undefined;
  if (!row || !row.active || !row.scim_token_hash) {
    res.status(401).json({ success: false, error: 'invalid_scim_provider' });
    return null;
  }
  if (row.scim_token_hash !== hashPassword(`scim:${token}`)) {
    res.status(401).json({ success: false, error: 'invalid_scim_token' });
    return null;
  }
  return {
    providerId: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    protocol: row.protocol,
  };
};

app.post('/api/auth/scim/v2/Users', (req, res) => {
  const scope = requireScimProvider(req, res);
  if (!scope) return;

  const email = String(req.body?.email || req.body?.userName || '').trim().toLowerCase();
  const roleRaw = String(req.body?.role || 'member').trim().toLowerCase();
  const role = roleRaw === 'owner' || roleRaw === 'admin' || roleRaw === 'member' ? roleRaw : 'member';
  const active = req.body?.active === false ? 0 : 1;

  if (!email) {
    res.status(400).json({ success: false, error: 'email_required' });
    return;
  }

  const existing = runtimeDb
    .prepare(`SELECT id, email, role, tenant_id, workspace_id, is_active FROM auth_users WHERE email = ? AND tenant_id = ? AND workspace_id = ?`)
    .get(email, scope.tenantId, scope.workspaceId) as
    | { id: string; email: string; role: string; tenant_id: string; workspace_id: string; is_active: number }
    | undefined;

  if (existing) {
    runtimeDb
      .prepare(`UPDATE auth_users SET role = ?, is_active = ? WHERE id = ?`)
      .run(role, active, existing.id);
    res.status(200).json({
      success: true,
      operation: 'upsert',
      user: {
        id: existing.id,
        email: existing.email,
        role,
        active: Boolean(active),
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
      },
    });
    return;
  }

  const userId = `user-${crypto.randomUUID()}`;
  runtimeDb
    .prepare(
      `INSERT INTO auth_users (id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      email,
      hashPassword(`scim:${scope.providerId}:${crypto.randomUUID()}`),
      scope.tenantId,
      scope.workspaceId,
      role,
      active,
      new Date().toISOString(),
    );

  res.status(201).json({
    success: true,
    operation: 'create',
    user: {
      id: userId,
      email,
      role,
      active: Boolean(active),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    },
  });
});

app.patch('/api/auth/scim/v2/Users/:id', (req, res) => {
  const scope = requireScimProvider(req, res);
  if (!scope) return;
  const userId = String(req.params?.id || '').trim();
  if (!userId) {
    res.status(400).json({ success: false, error: 'user_id_required' });
    return;
  }
  const row = runtimeDb
    .prepare(`SELECT id, email, role, is_active FROM auth_users WHERE id = ? AND tenant_id = ? AND workspace_id = ?`)
    .get(userId, scope.tenantId, scope.workspaceId) as
    | { id: string; email: string; role: string; is_active: number }
    | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'user_not_found' });
    return;
  }
  const nextRoleRaw = String(req.body?.role || row.role).trim().toLowerCase();
  const nextRole = nextRoleRaw === 'owner' || nextRoleRaw === 'admin' || nextRoleRaw === 'member' ? nextRoleRaw : row.role;
  const nextActive = typeof req.body?.active === 'boolean' ? (req.body.active ? 1 : 0) : row.is_active;
  runtimeDb
    .prepare(`UPDATE auth_users SET role = ?, is_active = ? WHERE id = ?`)
    .run(nextRole, nextActive, userId);
  res.json({
    success: true,
    user: {
      id: userId,
      email: row.email,
      role: nextRole,
      active: Boolean(nextActive),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    },
  });
});

app.delete('/api/auth/scim/v2/Users/:id', (req, res) => {
  const scope = requireScimProvider(req, res);
  if (!scope) return;
  const userId = String(req.params?.id || '').trim();
  if (!userId) {
    res.status(400).json({ success: false, error: 'user_id_required' });
    return;
  }
  const row = runtimeDb
    .prepare(`SELECT id FROM auth_users WHERE id = ? AND tenant_id = ? AND workspace_id = ?`)
    .get(userId, scope.tenantId, scope.workspaceId) as { id: string } | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: 'user_not_found' });
    return;
  }
  runtimeDb.prepare(`UPDATE auth_users SET is_active = 0 WHERE id = ?`).run(userId);
  runtimeDb.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(userId);
  res.json({ success: true, deactivated: true, userId });
});

app.post('/api/auth/sso/login', (req, res) => {
  const providerId = String(req.body?.providerId || '').trim();
  const protocolRaw = String(req.body?.protocol || '').trim().toLowerCase();
  const protocol = protocolRaw === 'oidc' || protocolRaw === 'saml' ? protocolRaw : '';
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!providerId || !protocol || !email) {
    res.status(400).json({ success: false, error: 'provider_protocol_email_required' });
    return;
  }

  const provider = runtimeDb
    .prepare(
      `SELECT id, name, protocol, tenant_id, workspace_id, active
       FROM auth_sso_providers
       WHERE id = ?`,
    )
    .get(providerId) as
    | { id: string; name: string; protocol: string; tenant_id: string; workspace_id: string; active: number }
    | undefined;
  if (!provider || !provider.active || provider.protocol !== protocol) {
    res.status(401).json({ success: false, error: 'invalid_sso_provider' });
    return;
  }

  let user = runtimeDb
    .prepare(
      `SELECT id, email, role, tenant_id, workspace_id, is_active
       FROM auth_users
       WHERE email = ? AND tenant_id = ? AND workspace_id = ?`,
    )
    .get(email, provider.tenant_id, provider.workspace_id) as
    | { id: string; email: string; role: string; tenant_id: string; workspace_id: string; is_active: number }
    | undefined;

  if (!user) {
    const userId = `user-${crypto.randomUUID()}`;
    runtimeDb
      .prepare(
        `INSERT INTO auth_users (id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'member', 1, ?)`,
      )
      .run(
        userId,
        email,
        hashPassword(`sso:${provider.id}:${crypto.randomUUID()}`),
        provider.tenant_id,
        provider.workspace_id,
        new Date().toISOString(),
      );
    user = {
      id: userId,
      email,
      role: 'member',
      tenant_id: provider.tenant_id,
      workspace_id: provider.workspace_id,
      is_active: 1,
    };
  }

  if (!user.is_active) {
    res.status(401).json({ success: false, error: 'user_inactive' });
    return;
  }

  const session = createAuthSession({
    userId: user.id,
    tenantId: user.tenant_id,
    workspaceId: user.workspace_id,
    userAgent: req.header('user-agent') || '',
    ipAddress: req.ip || '',
  });

  res.json({
    success: true,
    token: session.token,
    refreshToken: session.refreshToken,
    tokenType: 'Bearer',
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      workspaceId: user.workspace_id,
    },
    sso: {
      providerId: provider.id,
      providerName: provider.name,
      protocol: provider.protocol,
    },
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = String(req.body?.refreshToken || '').trim();
  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'refresh_token_required' });
    return;
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = runtimeDb
    .prepare(
      `SELECT s.token, s.user_id, s.tenant_id, s.workspace_id, s.expires_at, s.revoked_at, u.email, u.role, u.is_active
       FROM auth_sessions s
       JOIN auth_users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = ?`,
    )
    .get(refreshTokenHash) as
    | {
        token: string;
        user_id: string;
        tenant_id: string;
        workspace_id: string;
        expires_at: string;
        revoked_at: string | null;
        email: string;
        role: string;
        is_active: number;
      }
    | undefined;

  if (!session || !session.is_active || session.revoked_at) {
    res.status(401).json({ success: false, error: 'invalid_refresh_token' });
    return;
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    runtimeDb.prepare('DELETE FROM auth_sessions WHERE token = ?').run(session.token);
    res.status(401).json({ success: false, error: 'refresh_token_expired' });
    return;
  }

  const newToken = createSessionToken('sess');
  const newRefreshToken = createSessionToken('refresh');
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  runtimeDb
    .prepare(
      `UPDATE auth_sessions
       SET token = ?, refresh_token_hash = ?, expires_at = ?, user_agent = ?, ip_address = ?, revoked_at = NULL
       WHERE token = ?`,
    )
    .run(
      newToken,
      newRefreshTokenHash,
      newExpiresAt,
      String(req.header('user-agent') || '').slice(0, 512),
      String(req.ip || '').slice(0, 128),
      session.token,
    );

  res.json({
    success: true,
    token: newToken,
    refreshToken: newRefreshToken,
    tokenType: 'Bearer',
    expiresAt: newExpiresAt,
    user: {
      id: session.user_id,
      email: session.email,
      role: session.role,
      tenantId: session.tenant_id,
      workspaceId: session.workspace_id,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = getAuthContext(req);
  if (!auth) {
    res.status(401).json({ success: false, error: 'unauthorized' });
    return;
  }
  runtimeDb.prepare('DELETE FROM auth_sessions WHERE token = ?').run(auth.token);
  res.json({ success: true });
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


app.get('/api/cockpit/environments', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const projectId = String(req.query?.projectId || '').trim() || undefined;
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 200), 1000));
  const items = environmentStateStore.listByScope({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
    limit,
  });
  res.json({ success: true, items, count: items.length });
});

function resolveEnvironmentByAuthScope(input: {
  tenantId: string;
  workspaceId: string;
  projectId?: string;
}) {
  const environmentId = buildPersistedEnvironmentId({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
  });
  return environmentStateStore.get(environmentId);
}

function enforceRequestedScopeMatchesAuth(
  req: express.Request,
  auth: { tenantId: string; workspaceId: string },
): { ok: true } | { ok: false; status: number; error: string; message: string } {
  const requestedTenantId = String(req.body?.tenantId || req.query?.tenantId || '').trim();
  const requestedWorkspaceId = String(req.body?.workspaceId || req.query?.workspaceId || '').trim();
  if (requestedTenantId && requestedTenantId !== auth.tenantId) {
    return {
      ok: false,
      status: 403,
      error: 'forbidden_cross_tenant_access',
      message: 'Requested tenant scope does not match authenticated tenant',
    };
  }
  if (requestedWorkspaceId && requestedWorkspaceId !== auth.workspaceId) {
    return {
      ok: false,
      status: 403,
      error: 'forbidden_cross_workspace_access',
      message: 'Requested workspace scope does not match authenticated workspace',
    };
  }
  return { ok: true };
}

function resolveLastWarmupStatus(input: { environmentId: string }): { lastWarmupAt?: string; ok?: boolean; error?: string } {
  try {
    const file = path.resolve(process.cwd(), 'docs/runtime/governance/logs/control-actions.jsonl');
    if (!fs.existsSync(file)) return {};
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        if (String(row?.action || '') !== 'environment_warmup') continue;
        const environmentId = String(row?.result?.environmentId || '').trim();
        if (environmentId !== input.environmentId) continue;
        return {
          ...(row?.createdAt ? { lastWarmupAt: String(row.createdAt) } : {}),
          ...(typeof row?.result?.ok === 'boolean' ? { ok: Boolean(row.result.ok) } : {}),
          ...(row?.result?.error ? { error: String(row.result.error) } : {}),
        };
      } catch {
        // ignore malformed line
      }
    }
    return {};
  } catch {
    return {};
  }
}

function readEnvironmentLifecycleTelemetry(input: { environmentId: string; limit?: number }): Array<{
  action: string;
  timestamp: string;
  ok?: boolean;
  durationMs?: number;
  status?: string;
  error?: string;
}> {
  try {
    const file = path.resolve(process.cwd(), 'docs/runtime/governance/logs/control-actions.jsonl');
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    const out: Array<{
      action: string;
      timestamp: string;
      ok?: boolean;
      durationMs?: number;
      status?: string;
      error?: string;
    }> = [];
    const acceptedActions = new Set(['environment_provision', 'environment_warmup', 'environment_suspend', 'environment_resume', 'environment_terminate']);
    for (const line of lines) {
      try {
        const row = JSON.parse(line);
        const action = String(row?.action || '');
        if (!acceptedActions.has(action)) continue;
        const environmentId = String(row?.result?.environmentId || '').trim();
        if (environmentId !== input.environmentId) continue;
        out.push({
          action,
          timestamp: String(row?.createdAt || new Date().toISOString()),
          ...(typeof row?.result?.ok === 'boolean' ? { ok: Boolean(row.result.ok) } : {}),
          ...(Number.isFinite(Number(row?.result?.durationMs)) ? { durationMs: Number(row.result.durationMs) } : {}),
          ...(row?.result?.status ? { status: String(row.result.status) } : {}),
          ...(row?.result?.error ? { error: String(row.result.error) } : {}),
        });
      } catch {
        // ignore malformed row
      }
    }
    const sorted = out.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const limit = Math.max(1, Math.min(Number(input.limit || 100), 500));
    return sorted.slice(-limit);
  } catch {
    return [];
  }
}


app.post('/api/cockpit/environments/provision', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  const projectId = String(req.body?.projectId || '').trim() || undefined;
  const force = Boolean(req.body?.force);
  const result = environmentProvisioningService.provisionOnDemand({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
    actorId: auth.userId,
    force,
  });
  appendControlActionAudit({
    action: 'environment_provision',
    projectId: projectId || null,
    actorId: auth.userId,
    result: { ok: result.ok, status: result.status, environmentId: result.environmentId, steps: result.steps },
  });
  if (!result.ok) {
    res.status(500).json({ success: false, error: 'environment_provision_failed', ...result });
    return;
  }
  res.json({ success: true, ...result });
});

app.post('/api/cockpit/environments/warmup', async (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  const projectId = String(req.body?.projectId || '').trim() || undefined;
  const provision = environmentProvisioningService.provisionOnDemand({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
    actorId: auth.userId,
  });
  if (!provision.ok) {
    res.status(500).json({ success: false, error: 'environment_provision_failed', ...provision });
    return;
  }

  const warmup = await environmentWarmupService.warmup({
    environment: provision.environment,
    runChecks: async () => {
      const checks: WarmupCheck[] = [];
      try {
        const project = projectId ? projectStore.get(projectId) : undefined;
        const discoveryRoot = project?.agentContextPath || project?.worktreePath || process.cwd();
        const snapshot = await refreshCatalog(discoveryRoot, { activate: true });
        checks.push({
          id: 'catalog_refresh',
          ok: true,
          detail: `agents=${snapshot.agents.length};pipelines=${snapshot.pipelines.length};skills=${snapshot.skills.length}`,
        });
      } catch (error: any) {
        checks.push({
          id: 'catalog_refresh',
          ok: false,
          detail: String(error?.message || 'catalog_refresh_failed'),
        });
      }

      try {
        const cfg = getCockpitExecutorConfig();
        checks.push({
          id: 'executor_config',
          ok: true,
          detail: `backend=${cfg.backend || 'unknown'}`,
        });
      } catch (error: any) {
        checks.push({
          id: 'executor_config',
          ok: false,
          detail: String(error?.message || 'executor_config_unavailable'),
        });
      }

      try {
        const [pgSecrets, pgObjects] = await Promise.all([shouldUsePostgresSecrets(), shouldUsePostgresObjects()]);
        checks.push({
          id: 'storage_backends',
          ok: true,
          detail: `secrets=${pgSecrets ? 'postgres' : 'sqlite'};objects=${pgObjects ? 'postgres' : 'sqlite'}`,
        });
      } catch (error: any) {
        checks.push({
          id: 'storage_backends',
          ok: false,
          detail: String(error?.message || 'storage_backend_check_failed'),
        });
      }
      return checks;
    },
  });

  appendControlActionAudit({
    action: 'environment_warmup',
    projectId: projectId || null,
    actorId: auth.userId,
    result: {
      ok: warmup.ok,
      environmentId: warmup.environment.environmentId,
      durationMs: warmup.durationMs,
      checks: warmup.checks,
      ...(warmup.error ? { error: warmup.error } : {}),
    },
  });

  if (!warmup.ok) {
    res.status(500).json({ success: false, error: 'environment_warmup_failed', ...warmup });
    return;
  }
  res.json({ success: true, ...warmup });
});

app.post('/api/cockpit/environments/suspend', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  const projectId = String(req.body?.projectId || '').trim() || undefined;
  const existing = resolveEnvironmentByAuthScope({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'environment_not_found' });
    return;
  }
  const transition = environmentSuspendResumeService.suspend({
    environment: existing,
    actorId: auth.userId,
  });
  appendControlActionAudit({
    action: 'environment_suspend',
    projectId: projectId || null,
    actorId: auth.userId,
    result: {
      ok: transition.ok,
      from: transition.from,
      to: transition.to,
      environmentId: transition.environment.environmentId,
      ...(transition.error ? { error: transition.error } : {}),
    },
  });
  if (!transition.ok) {
    res.status(409).json({ success: false, error: 'environment_suspend_invalid_transition', ...transition });
    return;
  }
  res.json({
    success: true,
    ...transition,
    consistency: {
      queue: 'preserved',
      memory: 'preserved',
      artifacts: 'preserved',
    },
  });
});

app.post('/api/cockpit/environments/resume', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  const projectId = String(req.body?.projectId || '').trim() || undefined;
  const existing = resolveEnvironmentByAuthScope({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'environment_not_found' });
    return;
  }
  const transition = environmentSuspendResumeService.resume({
    environment: existing,
    actorId: auth.userId,
  });
  appendControlActionAudit({
    action: 'environment_resume',
    projectId: projectId || null,
    actorId: auth.userId,
    result: {
      ok: transition.ok,
      from: transition.from,
      to: transition.to,
      environmentId: transition.environment.environmentId,
      ...(transition.error ? { error: transition.error } : {}),
    },
  });
  if (!transition.ok) {
    res.status(409).json({ success: false, error: 'environment_resume_invalid_transition', ...transition });
    return;
  }
  res.json({
    success: true,
    ...transition,
    consistency: {
      queue: 'preserved',
      memory: 'preserved',
      artifacts: 'preserved',
    },
  });
});

app.post('/api/cockpit/environments/terminate', (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  const projectId = String(req.body?.projectId || '').trim() || undefined;
  const existing = resolveEnvironmentByAuthScope({
    tenantId: auth.tenantId,
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
  });
  if (!existing) {
    res.status(404).json({ success: false, error: 'environment_not_found' });
    return;
  }
  const transition = environmentSuspendResumeService.terminate({
    environment: existing,
    actorId: auth.userId,
  });
  appendControlActionAudit({
    action: 'environment_terminate',
    projectId: projectId || null,
    actorId: auth.userId,
    result: {
      ok: transition.ok,
      from: transition.from,
      to: transition.to,
      environmentId: transition.environment.environmentId,
      ...(transition.error ? { error: transition.error } : {}),
    },
  });
  if (!transition.ok) {
    res.status(409).json({ success: false, error: 'environment_terminate_invalid_transition', ...transition });
    return;
  }
  res.json({ success: true, ...transition });
});

app.get('/api/cockpit/environments/status', async (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  try {
    const projectId = String(req.query?.projectId || '').trim() || undefined;
    const environment = resolveEnvironmentByAuthScope({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      ...(projectId ? { projectId } : {}),
    });
    if (!environment) {
      res.status(404).json({ success: false, error: 'environment_not_found' });
      return;
    }
    const { DynamicWorkerSpawnManager } = await import('../runtime/workers/DynamicWorkerSpawnManager');
    const { ProjectDispatchQueue } = await import('../runtime/queue/ProjectDispatchQueue');
    const workers = DynamicWorkerSpawnManager.controllerContractSnapshot({
      projectId: projectId || undefined,
      environmentId: environment.environmentId,
      heartbeatTimeoutMs: Number(process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000),
    });
    const queueDepthByKey = await ProjectDispatchQueue.snapshotAsync(projectId || undefined, {
      environmentId: environment.environmentId,
    });
    const queuePressure = Object.values(queueDepthByKey).reduce((acc, n) => acc + Number(n || 0), 0);
    const warmupStatus = resolveLastWarmupStatus({ environmentId: environment.environmentId });
    res.json({
      success: true,
      environment,
      workerSummary: {
        total: workers.length,
        active: workers.filter((w: any) => String(w.executionState) === 'active').length,
        standby: workers.filter((w: any) => String(w.executionState) === 'standby').length,
      },
      queueSummary: {
        depthByKey: queueDepthByKey,
        pressure: queuePressure,
      },
      activity: {
        lastActivityAt: environment.lastActivityAt,
        ...(warmupStatus.lastWarmupAt ? { lastWarmupAt: warmupStatus.lastWarmupAt } : {}),
      },
      warmupStatus: {
        ...(typeof warmupStatus.ok === 'boolean' ? { ok: warmupStatus.ok } : {}),
        ...(warmupStatus.error ? { error: warmupStatus.error } : {}),
      },
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'environment_status_fetch_failed',
      message: error?.message || 'Failed to fetch environment status',
    });
  }
});

app.get('/api/cockpit/environments/telemetry', async (req, res) => {
  const auth = requireRole(req, res, 'member');
  if (!auth) return;
  const scopeCheck = enforceRequestedScopeMatchesAuth(req, auth);
  if (!scopeCheck.ok) {
    res.status(scopeCheck.status).json({ success: false, error: scopeCheck.error, message: scopeCheck.message });
    return;
  }
  try {
    const projectId = String(req.query?.projectId || '').trim() || undefined;
    const limit = Math.max(1, Math.min(Number(req.query?.limit || 100), 500));
    const environment = resolveEnvironmentByAuthScope({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      ...(projectId ? { projectId } : {}),
    });
    if (!environment) {
      res.status(404).json({ success: false, error: 'environment_not_found' });
      return;
    }
    const events = readEnvironmentLifecycleTelemetry({ environmentId: environment.environmentId, limit });
    const warmupDurations = events
      .filter((ev) => ev.action === 'environment_warmup' && Number.isFinite(Number(ev.durationMs || 0)))
      .map((ev) => Number(ev.durationMs || 0));
    const coldStartLatencyMs =
      warmupDurations.length > 0 ? Math.round(warmupDurations.reduce((acc, n) => acc + n, 0) / warmupDurations.length) : null;
    const failures = events.filter((ev) => ev.ok === false || Boolean(ev.error)).map((ev) => ({
      action: ev.action,
      timestamp: ev.timestamp,
      reason: ev.error || 'operation_failed',
    }));
    res.json({
      success: true,
      environmentId: environment.environmentId,
      traces: events,
      metrics: {
        totalEvents: events.length,
        coldStartLatencyMs,
        failureCount: failures.length,
      },
      failures,
      serverNow: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'environment_telemetry_fetch_failed',
      message: error?.message || 'Failed to fetch environment telemetry',
    });
  }
});

app.post('/api/chat', async (req, res) => {
  const rawMessage = String(req.body?.message || req.body?.prompt || '').trim();
  const threadId = String(req.body?.threadId || `thread_${Date.now()}`).trim();
  const projectId = String(req.body?.projectId || 'default').trim() || 'default';
  const runId = uuidv4();
  const parsed = parseRuntimeDirectives(rawMessage);
  const message = parsed.cleanedMessage || rawMessage;
  const auth = requireAuthForRuntimeIfEnabled(req, res);
  if (AUTH_MODE === 'required' && !auth) return;
  const workspaceContext = resolveWorkspaceRuntimeContext({
    projectId,
    auth,
    requestedTenantId: req.body?.tenantId,
    requestedWorkspaceId: req.body?.workspaceId,
  });
  if ('error' in workspaceContext) {
    res.status(workspaceContext.status).json({ success: false, error: workspaceContext.error, message: workspaceContext.message });
    return;
  }

  const environmentId = buildPersistedEnvironmentId({
    tenantId: workspaceContext.tenantId,
    workspaceId: workspaceContext.workspaceId,
    projectId,
  });
  environmentStateStore.upsert({
    environmentId,
    tenantId: workspaceContext.tenantId,
    workspaceId: workspaceContext.workspaceId,
    projectId,
    state: 'active',
  });

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
      const runtimeExecutionInput: any = {
        ticketId: String(req.body?.ticketId || '').trim(),
        runId,
        threadId,
        status: 'initialized',
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
        tenantId: workspaceContext.tenantId,
        workspaceId: workspaceContext.workspaceId,
        environmentId,
        userId: workspaceContext.userId || null,
      };
      const execution = await executeRuntimeRun(runtimeExecutionInput);
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
      const explicitAssistantMessage = (assistantMessage && assistantMessage.trim()) || '';
      const finalMessage = explicitAssistantMessage || '';
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
        workspaceContext,
        environmentId,
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
        environmentStateStore.upsert({
          environmentId,
          tenantId: workspaceContext.tenantId,
          workspaceId: workspaceContext.workspaceId,
          projectId,
          state: 'idle',
        });
        console.log(`[agent-system-backend] Request for run ${runId} was cancelled:`, error.message);
        // Do not return error to user if they just sent a new message, 
        // but the XHR might have already closed or we might want to return 204 or similar.
        // For now, let's just return success: false with a clear error.
        res.status(409).json({ success: false, error: 'run_cancelled', message: 'Current run was cancelled by a newer request.' });
      } else {
        environmentStateStore.upsert({
          environmentId,
          tenantId: workspaceContext.tenantId,
          workspaceId: workspaceContext.workspaceId,
          projectId,
          state: 'failed',
          lastError: String(error?.message || 'runtime_execution_failed'),
        });
        console.error('[agent-system-backend] chat error:', error);
        res.status(500).json({ success: false, error: 'internal_error', message: error.message });
      }
    }
  } catch (error: any) {
    environmentStateStore.upsert({
      environmentId: buildPersistedEnvironmentId({ tenantId: workspaceContext.tenantId, workspaceId: workspaceContext.workspaceId, projectId }),
      tenantId: workspaceContext.tenantId,
      workspaceId: workspaceContext.workspaceId,
      projectId,
      state: 'failed',
      lastError: String(error?.message || 'chat_execution_failed'),
    });
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
  if (AUTH_MODE === 'required' && !requireAuthForRuntimeIfEnabled(req, res)) return;
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
  if (AUTH_MODE === 'required' && !requireAuthForRuntimeIfEnabled(req, res)) return;
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
  objectStorageList: async (input) => {
    if (await shouldUsePostgresObjects()) {
      const pgItems = await postgresObjectStorage.listObjects(input);
      if (pgItems.length > 0) return pgItems;
    }
    return objectStorage.listObjects(input);
  },
  objectStorageGet: async (id) => {
    if (await shouldUsePostgresObjects()) {
      const pgObject = await postgresObjectStorage.getObject(id);
      if (pgObject) return pgObject;
    }
    return objectStorage.getObject(id);
  },
  objectStoragePut: async (input) => {
    const sqliteStored = objectStorage.putObject(input);
    if (await shouldUsePostgresObjects()) {
      try {
        await postgresObjectStorage.putObject(input);
      } catch {
        // sqlite mirror already persisted
      }
    }
    return sqliteStored;
  },
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

const startServer = async () => {
  await hydrateControlPlaneFromPostgres();
  app.listen(PORT, HOST, () => {
    console.log(`[agent-system-backend] listening on http://${HOST}:${PORT}`);
  });
};

void startServer();
