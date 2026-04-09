type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
  end?: () => Promise<void>;
};

interface PostgresControlPlaneStoreOptions {
  connectionString?: string;
}

export class PostgresControlPlaneStore {
  private connectionString: string;
  private client: Queryable | null = null;
  private initPromise: Promise<void> | null = null;
  private enabled = false;
  private initError: string | null = null;

  constructor(options?: PostgresControlPlaneStoreOptions) {
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
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
    await this.client!.query(
      `INSERT INTO cockpit_audit_meta_pg(action, project_id, actor_id, reason, target_json, result_json, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW())`,
      [
        input.action,
        input.projectId || null,
        input.actorId || null,
        input.reason || null,
        JSON.stringify(input.target || {}),
        JSON.stringify(input.result || {}),
      ],
    );
    return true;
  }
}
