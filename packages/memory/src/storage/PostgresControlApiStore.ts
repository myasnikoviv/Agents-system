import {
  buildAuditHashMaterialFromRow,
  computeAuditChainHash,
  computeAuditPayloadHash,
} from '@system/shared';

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
  end?: () => Promise<void>;
};

interface PostgresControlApiStoreOptions {
  connectionString?: string;
}

export class PostgresControlApiStore {
  private connectionString: string;
  private client: Queryable | null = null;
  private initPromise: Promise<void> | null = null;
  private enabled = false;
  private initError: string | null = null;

  constructor(options?: PostgresControlApiStoreOptions) {
    this.connectionString = String(options?.connectionString || process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getInitError(): string | null {
    return this.initError;
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initInternal();
    return this.initPromise;
  }

  private async initInternal(): Promise<void> {
    if (!this.connectionString) {
      this.enabled = false;
      return;
    }
    try {
      const mod = await import('pg').catch(() => null as any);
      const PoolCtor = mod?.Pool;
      if (!PoolCtor) {
        this.enabled = false;
        this.initError = 'pg_module_not_available';
        return;
      }
      const pool = new PoolCtor({ connectionString: this.connectionString });
      await pool.query('SELECT 1');
      this.client = pool as Queryable;
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS cockpit_settings_pg (
          section TEXT PRIMARY KEY,
          value_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cockpit_state_pg (
          key TEXT PRIMARY KEY,
          value_json JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cockpit_policy_meta_pg (
          id BIGSERIAL PRIMARY KEY,
          project_id TEXT,
          event_kind TEXT NOT NULL,
          entity_id TEXT,
          payload_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cockpit_audit_meta_pg (
          id BIGSERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          project_id TEXT,
          actor_id TEXT,
          reason TEXT,
          target_json JSONB,
          result_json JSONB,
          entry_json JSONB,
          prev_hash TEXT,
          payload_hash TEXT,
          chain_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE cockpit_audit_meta_pg ADD COLUMN IF NOT EXISTS entry_json JSONB;
        ALTER TABLE cockpit_audit_meta_pg ADD COLUMN IF NOT EXISTS prev_hash TEXT;
        ALTER TABLE cockpit_audit_meta_pg ADD COLUMN IF NOT EXISTS payload_hash TEXT;
        ALTER TABLE cockpit_audit_meta_pg ADD COLUMN IF NOT EXISTS chain_hash TEXT;
        CREATE OR REPLACE FUNCTION cockpit_audit_meta_pg_block_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'cockpit_audit_meta_pg is append-only';
        END;
        $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS cockpit_audit_meta_pg_no_update ON cockpit_audit_meta_pg;
        CREATE TRIGGER cockpit_audit_meta_pg_no_update
        BEFORE UPDATE ON cockpit_audit_meta_pg
        FOR EACH ROW
        EXECUTE FUNCTION cockpit_audit_meta_pg_block_mutation();
        DROP TRIGGER IF EXISTS cockpit_audit_meta_pg_no_delete ON cockpit_audit_meta_pg;
        CREATE TRIGGER cockpit_audit_meta_pg_no_delete
        BEFORE DELETE ON cockpit_audit_meta_pg
        FOR EACH ROW
        EXECUTE FUNCTION cockpit_audit_meta_pg_block_mutation();
      `);
      this.enabled = true;
      this.initError = null;
    } catch (error: any) {
      this.enabled = false;
      this.initError = String(error?.message || 'postgres_init_failed');
      this.client = null;
    }
  }

  private async ensureReady(): Promise<boolean> {
    await this.init();
    return Boolean(this.enabled && this.client);
  }

  async health(): Promise<{ enabled: boolean; ok: boolean; error?: string }> {
    const ready = await this.ensureReady();
    if (!ready) {
      return { enabled: false, ok: false, ...(this.initError ? { error: this.initError } : {}) };
    }
    try {
      await this.client!.query('SELECT 1');
      return { enabled: true, ok: true };
    } catch (error: any) {
      return { enabled: true, ok: false, error: String(error?.message || 'postgres_health_failed') };
    }
  }

  async upsertSetting(section: string, value: unknown): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    await this.client!.query(
      `INSERT INTO cockpit_settings_pg(section, value_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT(section) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      [section, JSON.stringify(value ?? {})],
    );
    return true;
  }

  async getSetting(section: string): Promise<{ value: unknown; updatedAt?: string } | null> {
    if (!(await this.ensureReady())) return null;
    const result = await this.client!.query(
      `SELECT value_json, updated_at
       FROM cockpit_settings_pg
       WHERE section = $1
       LIMIT 1`,
      [section],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    if (!row) return null;
    return {
      value: row?.value_json ?? {},
      updatedAt: row?.updated_at ? String(row.updated_at) : undefined,
    };
  }

  async listSettings(): Promise<Array<{ section: string; value: unknown; updatedAt?: string }>> {
    if (!(await this.ensureReady())) return [];
    const result = await this.client!.query(
      `SELECT section, value_json, updated_at
       FROM cockpit_settings_pg
       ORDER BY section ASC`,
    );
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return rows.map((row: any) => ({
      section: String(row?.section || ''),
      value: row?.value_json ?? {},
      updatedAt: row?.updated_at ? String(row.updated_at) : undefined,
    }));
  }

  async upsertState(key: string, value: unknown): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    await this.client!.query(
      `INSERT INTO cockpit_state_pg(key, value_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT(key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at`,
      [key, JSON.stringify(value ?? {})],
    );
    return true;
  }

  async getState(key: string): Promise<{ value: unknown; updatedAt?: string } | null> {
    if (!(await this.ensureReady())) return null;
    const result = await this.client!.query(
      `SELECT value_json, updated_at
       FROM cockpit_state_pg
       WHERE key = $1
       LIMIT 1`,
      [key],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    if (!row) return null;
    return {
      value: row?.value_json ?? {},
      updatedAt: row?.updated_at ? String(row.updated_at) : undefined,
    };
  }

  async recordPolicyMetadata(input: {
    projectId?: string;
    eventKind: string;
    entityId?: string;
    payload?: Record<string, any>;
  }): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    await this.client!.query(
      `INSERT INTO cockpit_policy_meta_pg(project_id, event_kind, entity_id, payload_json, created_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())`,
      [input.projectId || null, input.eventKind, input.entityId || null, JSON.stringify(input.payload || {})],
    );
    return true;
  }

  async recordAuditAction(input: {
    action: string;
    projectId?: string;
    actorId?: string;
    reason?: string;
    target?: Record<string, any>;
    result?: Record<string, any>;
  }): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    const timestamp = new Date().toISOString();
    const rowSeed = {
      id: `pg-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      action: input.action,
      projectId: input.projectId || null,
      actorId: input.actorId || null,
      reason: input.reason || '',
      target: input.target || {},
      result: input.result || {},
    };
    const previous = await this.client!.query(
      `SELECT chain_hash
       FROM cockpit_audit_meta_pg
       ORDER BY id DESC
       LIMIT 1`,
    );
    const prevHash = Array.isArray(previous?.rows) && previous.rows[0]?.chain_hash
      ? String(previous.rows[0].chain_hash)
      : 'genesis';
    const payloadHash = computeAuditPayloadHash(buildAuditHashMaterialFromRow(rowSeed));
    const chainHash = computeAuditChainHash({ prevHash, payloadHash });
    await this.client!.query(
      `INSERT INTO cockpit_audit_meta_pg(
          action, project_id, actor_id, reason, target_json, result_json, entry_json, prev_hash, payload_hash, chain_hash, created_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11::timestamptz)`,
      [
        input.action,
        input.projectId || null,
        input.actorId || null,
        input.reason || null,
        JSON.stringify(input.target || {}),
        JSON.stringify(input.result || {}),
        JSON.stringify(rowSeed),
        prevHash,
        payloadHash,
        chainHash,
        timestamp,
      ],
    );
    return true;
  }

  async listAuditActions(input?: {
    projectId?: string;
    limit?: number;
  }): Promise<
    Array<{
      id?: string;
      timestamp: string;
      action: string;
      projectId?: string | null;
      actorId?: string | null;
      reason?: string | null;
      target?: Record<string, any>;
      result?: Record<string, any>;
      prevHash?: string;
      payloadHash?: string;
      hash?: string;
    }>
  > {
    if (!(await this.ensureReady())) return [];
    const limit = Math.max(1, Math.min(5000, Number(input?.limit || 1000)));
    const projectId = String(input?.projectId || '').trim();
    const sql = projectId
      ? `SELECT id, action, project_id, actor_id, reason, target_json, result_json, prev_hash, payload_hash, chain_hash, created_at
         FROM cockpit_audit_meta_pg
         WHERE project_id = $1
         ORDER BY id DESC
         LIMIT $2`
      : `SELECT id, action, project_id, actor_id, reason, target_json, result_json, prev_hash, payload_hash, chain_hash, created_at
         FROM cockpit_audit_meta_pg
         ORDER BY id DESC
         LIMIT $1`;
    const params = projectId ? [projectId, limit] : [limit];
    const result = await this.client!.query(sql, params);
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return rows
      .map((row: any) => ({
        id: row?.id ? String(row.id) : undefined,
        timestamp: String(row?.created_at || new Date().toISOString()),
        action: String(row?.action || 'control.unknown'),
        projectId: row?.project_id ? String(row.project_id) : null,
        actorId: row?.actor_id ? String(row.actor_id) : null,
        reason: row?.reason ? String(row.reason) : null,
        target: (row?.target_json && typeof row.target_json === 'object') ? row.target_json : {},
        result: (row?.result_json && typeof row.result_json === 'object') ? row.result_json : {},
        prevHash: row?.prev_hash ? String(row.prev_hash) : '',
        payloadHash: row?.payload_hash ? String(row.payload_hash) : '',
        hash: row?.chain_hash ? String(row.chain_hash) : '',
      }))
      .reverse();
  }
}
