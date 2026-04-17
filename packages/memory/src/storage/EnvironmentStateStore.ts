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

export interface EnvironmentStateStore {
  upsert(input: {
    environmentId: string;
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    state: PersistedEnvironmentState;
    lastActivityAt?: string;
    lastError?: string;
  }): PersistedEnvironmentRecord | Promise<PersistedEnvironmentRecord>;
  get(environmentId: string): PersistedEnvironmentRecord | null | Promise<PersistedEnvironmentRecord | null>;
  listByScope(input: {
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    limit?: number;
  }): PersistedEnvironmentRecord[] | Promise<PersistedEnvironmentRecord[]>;
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

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
};

export class PostgresEnvironmentStateStore implements EnvironmentStateStore {
  constructor(private readonly client: Queryable) {}

  async ensureSchema(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS cockpit_environments_pg (
        environment_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        project_id TEXT,
        state TEXT NOT NULL,
        last_activity_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_cockpit_env_pg_scope
        ON cockpit_environments_pg(tenant_id, workspace_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cockpit_env_pg_project
        ON cockpit_environments_pg(project_id, updated_at DESC);
    `);
  }

  async upsert(input: {
    environmentId: string;
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    state: PersistedEnvironmentState;
    lastActivityAt?: string;
    lastError?: string;
  }): Promise<PersistedEnvironmentRecord> {
    const now = new Date().toISOString();
    const environmentId = normalize(input.environmentId);
    const tenantId = normalize(input.tenantId, 'tenant:default');
    const workspaceId = normalize(input.workspaceId, 'workspace:default');
    const projectId = normalize(input.projectId) || null;
    const state = String(input.state || 'active') as PersistedEnvironmentState;
    const lastActivityAt = normalize(input.lastActivityAt, now);
    const lastError = normalize(input.lastError) || null;
    await this.client.query(
      `INSERT INTO cockpit_environments_pg(
         environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
       ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, NOW(), $7)
       ON CONFLICT(environment_id) DO UPDATE SET
         tenant_id=EXCLUDED.tenant_id,
         workspace_id=EXCLUDED.workspace_id,
         project_id=EXCLUDED.project_id,
         state=EXCLUDED.state,
         last_activity_at=EXCLUDED.last_activity_at,
         updated_at=NOW(),
         last_error=EXCLUDED.last_error`,
      [environmentId, tenantId, workspaceId, projectId, state, lastActivityAt, lastError],
    );
    const row = await this.get(environmentId);
    return row || {
      environmentId,
      tenantId,
      workspaceId,
      ...(projectId ? { projectId } : {}),
      state,
      lastActivityAt,
      updatedAt: now,
      ...(lastError ? { lastError } : {}),
    };
  }

  async get(environmentId: string): Promise<PersistedEnvironmentRecord | null> {
    const id = normalize(environmentId);
    if (!id) return null;
    const result = await this.client.query(
      `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
       FROM cockpit_environments_pg
       WHERE environment_id = $1
       LIMIT 1`,
      [id],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
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

  async listByScope(input: {
    tenantId: string;
    workspaceId: string;
    projectId?: string;
    limit?: number;
  }): Promise<PersistedEnvironmentRecord[]> {
    const tenantId = normalize(input.tenantId);
    const workspaceId = normalize(input.workspaceId);
    const projectId = normalize(input.projectId);
    const limit = Math.max(1, Math.min(Number(input.limit || 200), 1000));
    const result = projectId
      ? await this.client.query(
          `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
           FROM cockpit_environments_pg
           WHERE tenant_id = $1 AND workspace_id = $2 AND project_id = $3
           ORDER BY updated_at DESC
           LIMIT $4`,
          [tenantId, workspaceId, projectId, limit],
        )
      : await this.client.query(
          `SELECT environment_id, tenant_id, workspace_id, project_id, state, last_activity_at, updated_at, last_error
           FROM cockpit_environments_pg
           WHERE tenant_id = $1 AND workspace_id = $2
           ORDER BY updated_at DESC
           LIMIT $3`,
          [tenantId, workspaceId, limit],
        );
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return rows.map((row: any) => ({
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
