import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface SecretMeta {
  key: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
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
    userId?: string;
    key: string;
    value: string;
    createdBy?: string;
  }): Promise<SecretMeta>;
  getValue(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): Promise<string | null>;
  listMeta(input: { tenantId: string; workspaceId: string; userId?: string }): Promise<SecretMeta[]>;
  delete(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): Promise<boolean>;
}

function normalizeUserScope(userId?: string): string {
  const normalized = String(userId || '').trim();
  return normalized || '__workspace__';
}

function encodeScopedSecretKey(userId: string | undefined, key: string): string {
  return `${normalizeUserScope(userId)}::${String(key || '').trim()}`;
}

function decodeScopedSecretKey(storedKey: string): { userId: string; key: string } | null {
  const raw = String(storedKey || '');
  const idx = raw.indexOf('::');
  if (idx <= 0) return null;
  const userId = raw.slice(0, idx).trim();
  const key = raw.slice(idx + 2).trim();
  if (!userId || !key) return null;
  return { userId, key };
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
    userId?: string;
    key: string;
    value: string;
    createdBy?: string;
  }): SecretMeta {
    const now = new Date().toISOString();
    const tenantId = String(input.tenantId || '').trim();
    const workspaceId = String(input.workspaceId || '').trim();
    const key = String(input.key || '').trim();
    const userId = normalizeUserScope(input.userId || input.createdBy);
    const scopedKey = encodeScopedSecretKey(userId, key);
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
      key: scopedKey,
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
    `).get(tenantId, workspaceId, scopedKey) as any;
    return {
      key,
      tenantId,
      workspaceId,
      userId,
      createdAt: row?.created_at || now,
      updatedAt: row?.updated_at || now,
      createdBy: row?.created_by || undefined,
    };
  }

  getValue(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): string | null {
    const scopedKey = encodeScopedSecretKey(input.userId, input.key);
    const row = this.db.prepare(`
      SELECT cipher_text
      FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key = ?
      LIMIT 1
    `).get(input.tenantId, input.workspaceId, scopedKey) as { cipher_text?: string } | undefined;
    if (!row?.cipher_text) return null;
    try {
      return decrypt(row.cipher_text, this.encryptionSecret);
    } catch {
      return null;
    }
  }

  listMeta(input: { tenantId: string; workspaceId: string; userId?: string }): SecretMeta[] {
    const userPrefix = `${normalizeUserScope(input.userId)}::`;
    const rows = this.db.prepare(`
      SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
      FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key LIKE ?
      ORDER BY updated_at DESC
    `).all(input.tenantId, input.workspaceId, `${userPrefix}%`) as any[];
    return rows
      .map((row) => {
        const decoded = decodeScopedSecretKey(row.key);
        if (!decoded) return null;
        return {
          key: decoded.key,
          tenantId: row.tenant_id,
          workspaceId: row.workspace_id,
          userId: decoded.userId,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by || undefined,
        } as SecretMeta;
      })
      .filter((row): row is SecretMeta => Boolean(row));
  }

  delete(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): boolean {
    const scopedKey = encodeScopedSecretKey(input.userId, input.key);
    const out = this.db.prepare(`
      DELETE FROM cockpit_secrets
      WHERE tenant_id = ? AND workspace_id = ? AND key = ?
    `).run(input.tenantId, input.workspaceId, scopedKey);
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
    userId?: string;
    key: string;
    value: string;
    createdBy?: string;
  }): Promise<SecretMeta> {
    const now = new Date().toISOString();
    const tenantId = String(input.tenantId || '').trim();
    const workspaceId = String(input.workspaceId || '').trim();
    const key = String(input.key || '').trim();
    const userId = normalizeUserScope(input.userId || input.createdBy);
    const scopedKey = encodeScopedSecretKey(userId, key);
    if (!(await this.ensureReady())) {
      return {
        key,
        tenantId,
        workspaceId,
        userId,
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
      [tenantId, workspaceId, scopedKey, cipherText, input.createdBy || null],
    );
    const row = (await this.client!.query(
      `SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3
       LIMIT 1`,
      [tenantId, workspaceId, scopedKey],
    ))?.rows?.[0] as any;
    return {
      key,
      tenantId: String(row?.tenant_id || tenantId),
      workspaceId: String(row?.workspace_id || workspaceId),
      userId,
      createdAt: String(row?.created_at || now),
      updatedAt: String(row?.updated_at || now),
      createdBy: row?.created_by ? String(row.created_by) : undefined,
    };
  }

  async getValue(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): Promise<string | null> {
    if (!(await this.ensureReady())) return null;
    const scopedKey = encodeScopedSecretKey(input.userId, input.key);
    const row = (await this.client!.query(
      `SELECT cipher_text
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3
       LIMIT 1`,
      [input.tenantId, input.workspaceId, scopedKey],
    ))?.rows?.[0] as any;
    if (!row?.cipher_text) return null;
    try {
      return decrypt(String(row.cipher_text), this.encryptionSecret);
    } catch {
      return null;
    }
  }

  async listMeta(input: { tenantId: string; workspaceId: string; userId?: string }): Promise<SecretMeta[]> {
    if (!(await this.ensureReady())) return [];
    const userPrefix = `${normalizeUserScope(input.userId)}::`;
    const rows = (await this.client!.query(
      `SELECT tenant_id, workspace_id, key, created_at, updated_at, created_by
       FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key LIKE $3
       ORDER BY updated_at DESC`,
      [input.tenantId, input.workspaceId, `${userPrefix}%`],
    ))?.rows || [];
    return rows
      .map((row: any) => {
        const decoded = decodeScopedSecretKey(String(row.key || ''));
        if (!decoded) return null;
        return {
          key: decoded.key,
          tenantId: String(row.tenant_id || ''),
          workspaceId: String(row.workspace_id || ''),
          userId: decoded.userId,
          createdAt: String(row.created_at || new Date().toISOString()),
          updatedAt: String(row.updated_at || new Date().toISOString()),
          createdBy: row?.created_by ? String(row.created_by) : undefined,
        } as SecretMeta;
      })
      .filter((row): row is SecretMeta => Boolean(row));
  }

  async delete(input: { tenantId: string; workspaceId: string; userId?: string; key: string }): Promise<boolean> {
    if (!(await this.ensureReady())) return false;
    const scopedKey = encodeScopedSecretKey(input.userId, input.key);
    const result = await this.client!.query(
      `DELETE FROM cockpit_secrets_pg
       WHERE tenant_id = $1 AND workspace_id = $2 AND key = $3`,
      [input.tenantId, input.workspaceId, scopedKey],
    );
    return Number(result?.rowCount || 0) > 0;
  }
}
