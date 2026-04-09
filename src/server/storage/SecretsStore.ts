import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface SecretMeta {
  key: string;
  tenantId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[]; rowCount?: number }>;
};

function buildKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plain: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', buildKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(payload: string, secret: string): string {
  const [ivB64, tagB64, bodyB64] = String(payload || '').split(':');
  if (!ivB64 || !tagB64 || !bodyB64) return '';
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    buildKey(secret),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const raw = Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64')), decipher.final()]);
  return raw.toString('utf8');
}

export interface SecretsStore {
  upsert(input: {
    tenantId: string;
    workspaceId: string;
    key: string;
    value: string;
    createdBy?: string;
  }): Promise<SecretMeta>;
  getValue(input: { tenantId: string; workspaceId: string; key: string }): Promise<string | null>;
  listMeta(input: { tenantId: string; workspaceId: string }): Promise<SecretMeta[]>;
  delete(input: { tenantId: string; workspaceId: string; key: string }): Promise<boolean>;
}

export class SqliteSecretsStore {
  constructor(private readonly db: Database.Database, private readonly encryptionSecret: string) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cockpit_secrets (
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        key TEXT NOT NULL,
        cipher_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        PRIMARY KEY (tenant_id, workspace_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_cockpit_secrets_scope
        ON cockpit_secrets(tenant_id, workspace_id, updated_at);
    `);
  }

  upsert(input: {
    tenantId: string;
    workspaceId: string;
    key: string;
    value: string;
    createdBy?: string;
  }): SecretMeta {
    const now = new Date().toISOString();
    const tenantId = String(input.tenantId || '').trim();
    const workspaceId = String(input.workspaceId || '').trim();
    const key = String(input.key || '').trim();
    const cipherText = encrypt(input.value, this.encryptionSecret);
    this.db.prepare(`
      INSERT INTO cockpit_secrets(tenant_id, workspace_id, key, cipher_text, created_at, updated_at, created_by)
      VALUES (@tenant_id, @workspace_id, @key, @cipher_text, @created_at, @updated_at, @created_by)
      ON CONFLICT(tenant_id, workspace_id, key) DO UPDATE SET
        cipher_text = excluded.cipher_text,
        updated_at = excluded.updated_at,
        created_by = COALESCE(cockpit_secrets.created_by, excluded.created_by)
    `).run({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      key,
      cipher_text: cipherText,
      created_at: now,
      updated_at: now,
      created_by: input.createdBy || null,
    });
    const row = this.db.prepare(`
      SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
      FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key = ?
      LIMIT 1
    `).get(tenantId, workspaceId, key) as any;
    return {
      key,
      tenantId,
      workspaceId,
      createdAt: row?.created_at || now,
      updatedAt: row?.updated_at || now,
      createdBy: row?.created_by || undefined,
    };
  }

  getValue(input: { tenantId: string; workspaceId: string; key: string }): string | null {
    const row = this.db.prepare(`
      SELECT cipher_text
      FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key = ?
      LIMIT 1
    `).get(input.tenantId, input.workspaceId, input.key) as { cipher_text?: string } | undefined;
    if (!row?.cipher_text) return null;
    try {
      return decrypt(row.cipher_text, this.encryptionSecret);
    } catch {
      return null;
    }
  }

  listMeta(input: { tenantId: string; workspaceId: string }): SecretMeta[] {
    const rows = this.db.prepare(`
      SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
      FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ?
      ORDER BY updated_at DESC
    `).all(input.tenantId, input.workspaceId) as any[];
    return rows.map((row) => ({
      key: row.key,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by || undefined,
    }));
  }

  delete(input: { tenantId: string; workspaceId: string; key: string }): boolean {
    const out = this.db.prepare(`
      DELETE FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key = ?
    `).run(input.tenantId, input.workspaceId, input.key);
    return Number(out.changes || 0) > 0;
  }
}

export class PostgresSecretsStore implements SecretsStore {
  private connectionString: string;
  private client: Queryable | null = null;
  private initPromise: Promise<void> | null = null;
  private enabled = false;

  constructor(private readonly encryptionSecret: string, options?: { connectionString?: string }) {
    this.connectionString = String(options?.connectionString || process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async init(): Promise<void> {
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
        return;
      }
      const pool = new PoolCtor({ connectionString: this.connectionString });
      await pool.query('SELECT 1');
      this.client = pool as Queryable;
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS cockpit_secrets_pg (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          key TEXT NOT NULL,
          cipher_text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by TEXT,
          PRIMARY KEY (tenant_id, workspace_id, key)
        );
        CREATE INDEX IF NOT EXISTS idx_cockpit_secrets_pg_scope
          ON cockpit_secrets_pg(tenant_id, workspace_id, updated_at DESC);
      `);
      this.enabled = true;
    } catch {
      this.enabled = false;
      this.client = null;
    }
  }

  private async ensureReady(): Promise<boolean> {
    await this.init();
    return Boolean(this.enabled && this.client);
  }

  async ready(): Promise<boolean> {
    return this.ensureReady();
  }

  async upsert(input: {
    tenantId: string;
    workspaceId: string;
    key: string;
    value: string;
    createdBy?: string;
  }): Promise<SecretMeta> {
    const now = new Date().toISOString();
    const tenantId = String(input.tenantId || '').trim();
    const workspaceId = String(input.workspaceId || '').trim();
    const key = String(input.key || '').trim();
    if (!(await this.ensureReady())) {
      return {
        key,
        tenantId,
        workspaceId,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy || undefined,
      };
    }
    const cipherText = encrypt(input.value, this.encryptionSecret);
    await this.client!.query(
      `INSERT INTO cockpit_secrets_pg(tenant_id, workspace_id, key, cipher_text, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
       ON CONFLICT(tenant_id, workspace_id, key) DO UPDATE SET
         cipher_text = EXCLUDED.cipher_text,
         updated_at = NOW(),
         created_by = COALESCE(cockpit_secrets_pg.created_by, EXCLUDED.created_by)`,
      [tenantId, workspaceId, key, cipherText, input.createdBy || null],
    );
    const row = (await this.client!.query(
      `SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3
       LIMIT 1`,
      [tenantId, workspaceId, key],
    ))?.rows?.[0] as any;
    return {
      key,
      tenantId,
      workspaceId,
      createdAt: String(row?.created_at || now),
      updatedAt: String(row?.updated_at || now),
      createdBy: row?.created_by ? String(row.created_by) : undefined,
    };
  }

  async getValue(input: { tenantId: string; workspaceId: string; key: string }): Promise<string | null> {
    if (!(await this.ensureReady())) return null;
    const row = (await this.client!.query(
      `SELECT cipher_text
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3
       LIMIT 1`,
      [input.tenantId, input.workspaceId, input.key],
    ))?.rows?.[0] as any;
    if (!row?.cipher_text) return null;
    try {
      return decrypt(String(row.cipher_text), this.encryptionSecret);
    } catch {
      return null;
    }
  }

  async listMeta(input: { tenantId: string; workspaceId: string }): Promise<SecretMeta[]> {
    if (!(await this.ensureReady())) return [];
    const rows = (await this.client!.query(
      `SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2
       ORDER BY updated_at DESC`,
      [input.tenantId, input.workspaceId],
    ))?.rows || [];
    return rows.map((row: any) => ({
      key: String(row.key || ''),
      tenantId: String(row.tenant_id || ''),
      workspaceId: String(row.workspace_id || ''),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      createdBy: row?.created_by ? String(row.created_by) : undefined,
    }));
  }

  async delete(input: { tenantId: string; workspaceId: string; key: string }): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    const result = await this.client!.query(
      `DELETE FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3`,
      [input.tenantId, input.workspaceId, input.key],
    );
    return Number(result?.rowCount || 0) > 0;
  }
}
