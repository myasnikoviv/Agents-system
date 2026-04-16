import type Database from 'better-sqlite3';

export type PersistedEnvironmentState =
  | 'provisioning'
  | 'warming'
  | 'active'
  | 'idle'
  | 'suspended'
  | 'terminated'
  | 'failed';

export interface PersistedEnvironmentRecord {
  environmentId: string;
  tenantId: string;
  workspaceId: string;
  projectId?: string;
  state: PersistedEnvironmentState;
  lastActivityAt: string;
  updatedAt: string;
  lastError?: string;
}

function normalize(value: string | undefined, defaultValue = ''): string {
  const v = String(value || '').trim();
  return v || defaultValue;
}

export function buildPersistedEnvironmentId(input: {
  tenantId: string;
  workspaceId: string;
  projectId?: string;
}): string {
  const tenantId = normalize(input.tenantId, 'tenant:default');
  const workspaceId = normalize(input.workspaceId, 'workspace:default');
  const projectId = normalize(input.projectId);
  return projectId
    ? `env:${tenantId}:${workspaceId}:project:${projectId}`
    : `env:${tenantId}:${workspaceId}`;
}

export class SqliteEnvironmentStateStore {
  constructor(private readonly db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cockpit_environments (
        environment_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        project_id TEXT,
        state TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_cockpit_environments_scope
        ON cockpit_environments(tenant_id, workspace_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cockpit_environments_project
        ON cockpit_environments(project_id, updated_at DESC);
    `);
  }

  upsert(input: {
    environmentId: string;
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    state: PersistedEnvironmentState;
    lastActivityAt?: string;
    lastError?: string;
  }): PersistedEnvironmentRecord {
    const now = new Date().toISOString();
    const environmentId = normalize(input.environmentId);
    const tenantId = normalize(input.tenantId, 'tenant:default');
    const workspaceId = normalize(input.workspaceId, 'workspace:default');
    const projectId = normalize(input.projectId) || null;
    const state = String(input.state || 'active') as PersistedEnvironmentState;
    const lastActivityAt = normalize(input.lastActivityAt, now);
    const lastError = normalize(input.lastError) || null;

    this.db.prepare(
      `INSERT INTO cockpit_environments(
         environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(environment_id) DO UPDATE SET
         tenant_id=excluded.tenant_id,
         workspace_id=excluded.workspace_id,
         project_id=excluded.project_id,
         state=excluded.state,
         last_activity_at=excluded.last_activity_at,
         updated_at=excluded.updated_at,
         last_error=excluded.last_error`,
    ).run(environmentId, tenantId, workspaceId, projectId, state, lastActivityAt, now, lastError);

    const row = this.db
      .prepare(
        `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
         FROM cockpit_environments
         WHERE environment_id = ?
         LIMIT 1`,
      )
      .get(environmentId) as any;

    return {
      environmentId: String(row?.environment_id || environmentId),
      tenantId: String(row?.tenant_id || tenantId),
      workspaceId: String(row?.workspace_id || workspaceId),
      ...(row?.project_id ? { projectId: String(row.project_id) } : {}),
      state: String(row?.state || state) as PersistedEnvironmentState,
      lastActivityAt: String(row?.last_activity_at || lastActivityAt),
      updatedAt: String(row?.updated_at || now),
      ...(row?.last_error ? { lastError: String(row.last_error) } : {}),
    };
  }

  get(environmentId: string): PersistedEnvironmentRecord | null {
    const id = normalize(environmentId);
    if (!id) return null;
    const row = this.db
      .prepare(
        `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
         FROM cockpit_environments
         WHERE environment_id = ?
         LIMIT 1`,
      )
      .get(id) as any;
    if (!row) return null;
    return {
      environmentId: String(row.environment_id),
      tenantId: String(row.tenant_id),
      workspaceId: String(row.workspace_id),
      ...(row?.project_id ? { projectId: String(row.project_id) } : {}),
      state: String(row.state) as PersistedEnvironmentState,
      lastActivityAt: String(row.last_activity_at),
      updatedAt: String(row.updated_at),
      ...(row?.last_error ? { lastError: String(row.last_error) } : {}),
    };
  }

  listByScope(input: {
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    limit?: number;
  }): PersistedEnvironmentRecord[] {
    const tenantId = normalize(input.tenantId);
    const workspaceId = normalize(input.workspaceId);
    const projectId = normalize(input.projectId);
    const limit = Math.max(1, Math.min(Number(input.limit || 200), 1000));
    const rows = projectId
      ? (this.db
          .prepare(
            `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
             FROM cockpit_environments
             WHERE tenant_id = ? AND workspace_id = ? AND project_id = ?
             ORDER BY updated_at DESC
             LIMIT ?`,
          )
          .all(tenantId, workspaceId, projectId, limit) as any[])
      : (this.db
          .prepare(
            `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
             FROM cockpit_environments
             WHERE tenant_id = ? AND workspace_id = ?
             ORDER BY updated_at DESC
             LIMIT ?`,
          )
          .all(tenantId, workspaceId, limit) as any[]);

    return rows.map((row) => ({
      environmentId: String(row.environment_id),
      tenantId: String(row.tenant_id),
      workspaceId: String(row.workspace_id),
      ...(row?.project_id ? { projectId: String(row.project_id) } : {}),
      state: String(row.state) as PersistedEnvironmentState,
      lastActivityAt: String(row.last_activity_at),
      updatedAt: String(row.updated_at),
      ...(row?.last_error ? { lastError: String(row.last_error) } : {}),
    }));
  }
}
