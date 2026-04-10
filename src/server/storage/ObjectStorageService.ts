import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface StoredObjectRecord {
  id: string;
  bucket: string;
  key: string;
  tenantId?: string;
  workspaceId?: string;
  projectId?: string;
  threadId?: string;
  mimeType: string;
  size: number;
  checksumSha256: string;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface StoredObjectPayload extends StoredObjectRecord {
  contentBase64: string;
}

type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
};

function normalizeBucket(value?: string): string {
  const bucket = String(value || 'artifacts').trim();
  return bucket.length > 0 ? bucket.slice(0, 120) : 'artifacts';
}

function normalizeKey(value?: string): string {
  const key = String(value || '').trim();
  if (!key) return `object-${Date.now()}`;
  return key.slice(0, 512);
}

export class SqliteObjectStorageService {
  constructor(private readonly db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cockpit_object_storage (
        id TEXT PRIMARY KEY,
        bucket TEXT NOT NULL,
        key TEXT NOT NULL,
        tenant_id TEXT,
        workspace_id TEXT,
        project_id TEXT,
        thread_id TEXT,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        content_base64 TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_bucket_key
        ON cockpit_object_storage(bucket, key);
      CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_scope
        ON cockpit_object_storage(tenant_id, workspace_id, bucket, created_at);
      CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_project_thread
        ON cockpit_object_storage(project_id, thread_id, created_at);
    `);
    try { this.db.exec(`ALTER TABLE cockpit_object_storage ADD COLUMN tenant_id TEXT`); } catch {}
    try { this.db.exec(`ALTER TABLE cockpit_object_storage ADD COLUMN workspace_id TEXT`); } catch {}
  }

  putObject(input: {
    bucket?: string;
    key?: string;
    tenantId?: string;
    workspaceId?: string;
    projectId?: string;
    threadId?: string;
    mimeType?: string;
    contentBase64: string;
    metadata?: Record<string, any>;
  }): StoredObjectRecord {
    const bucket = normalizeBucket(input.bucket);
    const key = normalizeKey(input.key);
    const contentBase64 = String(input.contentBase64 || '');
    const raw = Buffer.from(contentBase64, 'base64');
    const checksumSha256 = crypto.createHash('sha256').update(raw).digest('hex');
    const id = `obj-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const metadata = input.metadata || {};
    const mimeType = String(input.mimeType || 'application/octet-stream');
    this.db.prepare(`
      INSERT INTO cockpit_object_storage(
        id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
      ) VALUES (@id, @bucket, @key, @tenant_id, @workspace_id, @project_id, @thread_id, @mime_type, @size, @checksum_sha256, @content_base64, @metadata_json, @created_at)
    `).run({
      id,
      bucket,
      key,
      tenant_id: input.tenantId || null,
      workspace_id: input.workspaceId || null,
      project_id: input.projectId || null,
      thread_id: input.threadId || null,
      mime_type: mimeType,
      size: raw.length,
      checksum_sha256: checksumSha256,
      content_base64: contentBase64,
      metadata_json: JSON.stringify(metadata),
      created_at: createdAt,
    });
    return {
      id,
      bucket,
      key,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      threadId: input.threadId,
      mimeType,
      size: raw.length,
      checksumSha256,
      createdAt,
      metadata,
    };
  }

  getObject(id: string, scope?: { tenantId?: string; workspaceId?: string }): StoredObjectPayload | null {
    const tenantId = String(scope?.tenantId || '').trim();
    const workspaceId = String(scope?.workspaceId || '').trim();
    const clauses = ['id = ?'];
    const values: any[] = [id];
    if (tenantId) {
      clauses.push('tenant_id = ?');
      values.push(tenantId);
    }
    if (workspaceId) {
      clauses.push('workspace_id = ?');
      values.push(workspaceId);
    }
    const row = this.db.prepare(`
      SELECT id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
      FROM cockpit_object_storage
      WHERE ${clauses.join(' AND ')}
      LIMIT 1
    `).get(...values) as any;
    if (!row) return null;
    return {
      id: row.id,
      bucket: row.bucket,
      key: row.key,
      tenantId: row.tenant_id || undefined,
      workspaceId: row.workspace_id || undefined,
      projectId: row.project_id || undefined,
      threadId: row.thread_id || undefined,
      mimeType: row.mime_type,
      size: Number(row.size || 0),
      checksumSha256: row.checksum_sha256,
      contentBase64: row.content_base64,
      createdAt: row.created_at,
      metadata: (() => {
        try { return JSON.parse(row.metadata_json || '{}'); } catch { return {}; }
      })(),
    };
  }

  listObjects(input?: {
    bucket?: string;
    tenantId?: string;
    workspaceId?: string;
    projectId?: string;
    threadId?: string;
    limit?: number;
  }): StoredObjectRecord[] {
    const bucket = input?.bucket ? normalizeBucket(input.bucket) : null;
    const limit = Math.max(1, Math.min(Number(input?.limit || 100), 500));
    const clauses: string[] = [];
    const values: any[] = [];
    if (bucket) {
      clauses.push('bucket = ?');
      values.push(bucket);
    }
    if (input?.tenantId) {
      clauses.push('tenant_id = ?');
      values.push(input.tenantId);
    }
    if (input?.workspaceId) {
      clauses.push('workspace_id = ?');
      values.push(input.workspaceId);
    }
    if (input?.projectId) {
      clauses.push('project_id = ?');
      values.push(input.projectId);
    }
    if (input?.threadId) {
      clauses.push('thread_id = ?');
      values.push(input.threadId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`
      SELECT id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, metadata_json, created_at
      FROM cockpit_object_storage
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...values, limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      bucket: row.bucket,
      key: row.key,
      tenantId: row.tenant_id || undefined,
      workspaceId: row.workspace_id || undefined,
      projectId: row.project_id || undefined,
      threadId: row.thread_id || undefined,
      mimeType: row.mime_type,
      size: Number(row.size || 0),
      checksumSha256: row.checksum_sha256,
      createdAt: row.created_at,
      metadata: (() => {
        try { return JSON.parse(row.metadata_json || '{}'); } catch { return {}; }
      })(),
    }));
  }
}

export class PostgresObjectStorageService {
  private connectionString: string;
  private client: Queryable | null = null;
  private initPromise: Promise<void> | null = null;
  private enabled = false;

  constructor(options?: { connectionString?: string }) {
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
        CREATE TABLE IF NOT EXISTS cockpit_object_storage_pg (
          id TEXT PRIMARY KEY,
          bucket TEXT NOT NULL,
          key TEXT NOT NULL,
          tenant_id TEXT,
          workspace_id TEXT,
          project_id TEXT,
          thread_id TEXT,
          mime_type TEXT NOT NULL,
          size BIGINT NOT NULL,
          checksum_sha256 TEXT NOT NULL,
          content_base64 TEXT NOT NULL,
          metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_pg_bucket_key
          ON cockpit_object_storage_pg(bucket, key);
        CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_pg_scope
          ON cockpit_object_storage_pg(tenant_id, workspace_id, bucket, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_pg_project_thread
          ON cockpit_object_storage_pg(project_id, thread_id, created_at DESC);
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

  async putObject(input: {
    bucket?: string;
    key?: string;
    tenantId?: string;
    workspaceId?: string;
    projectId?: string;
    threadId?: string;
    mimeType?: string;
    contentBase64: string;
    metadata?: Record<string, any>;
  }): Promise<StoredObjectRecord | null> {
    if (!(await this.ensureReady())) return null;
    const bucket = normalizeBucket(input.bucket);
    const key = normalizeKey(input.key);
    const contentBase64 = String(input.contentBase64 || '');
    const raw = Buffer.from(contentBase64, 'base64');
    const checksumSha256 = crypto.createHash('sha256').update(raw).digest('hex');
    const id = `obj-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const metadata = input.metadata || {};
    const mimeType = String(input.mimeType || 'application/octet-stream');
    await this.client!.query(
      `INSERT INTO cockpit_object_storage_pg(
         id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())`,
      [
        id,
        bucket,
        key,
        input.tenantId || null,
        input.workspaceId || null,
        input.projectId || null,
        input.threadId || null,
        mimeType,
        raw.length,
        checksumSha256,
        contentBase64,
        JSON.stringify(metadata),
      ],
    );
    return {
      id,
      bucket,
      key,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      threadId: input.threadId,
      mimeType,
      size: raw.length,
      checksumSha256,
      createdAt,
      metadata,
    };
  }

  async getObject(id: string, scope?: { tenantId?: string; workspaceId?: string }): Promise<StoredObjectPayload | null> {
    if (!(await this.ensureReady())) return null;
    const tenantId = String(scope?.tenantId || '').trim();
    const workspaceId = String(scope?.workspaceId || '').trim();
    const clauses: string[] = ['id = $1'];
    const values: any[] = [id];
    let idx = 2;
    if (tenantId) {
      clauses.push(`tenant_id = $${idx++}`);
      values.push(tenantId);
    }
    if (workspaceId) {
      clauses.push(`workspace_id = $${idx++}`);
      values.push(workspaceId);
    }
    const row = (await this.client!.query(
      `SELECT id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
       FROM cockpit_object_storage_pg
       WHERE ${clauses.join(' AND ')}
       LIMIT 1`,
      values,
    ))?.rows?.[0] as any;
    if (!row) return null;
    return {
      id: String(row.id),
      bucket: String(row.bucket),
      key: String(row.key),
      tenantId: row?.tenant_id ? String(row.tenant_id) : undefined,
      workspaceId: row?.workspace_id ? String(row.workspace_id) : undefined,
      projectId: row?.project_id ? String(row.project_id) : undefined,
      threadId: row?.thread_id ? String(row.thread_id) : undefined,
      mimeType: String(row.mime_type),
      size: Number(row.size || 0),
      checksumSha256: String(row.checksum_sha256),
      contentBase64: String(row.content_base64 || ''),
      createdAt: String(row.created_at || new Date().toISOString()),
      metadata: (row?.metadata_json && typeof row.metadata_json === 'object') ? row.metadata_json : {},
    };
  }

  async listObjects(input?: {
    bucket?: string;
    tenantId?: string;
    workspaceId?: string;
    projectId?: string;
    threadId?: string;
    limit?: number;
  }): Promise<StoredObjectRecord[]> {
    if (!(await this.ensureReady())) return [];
    const bucket = input?.bucket ? normalizeBucket(input.bucket) : null;
    const limit = Math.max(1, Math.min(Number(input?.limit || 100), 500));
    const clauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (bucket) {
      clauses.push(`bucket = $${idx++}`);
      values.push(bucket);
    }
    if (input?.tenantId) {
      clauses.push(`tenant_id = $${idx++}`);
      values.push(input.tenantId);
    }
    if (input?.workspaceId) {
      clauses.push(`workspace_id = $${idx++}`);
      values.push(input.workspaceId);
    }
    if (input?.projectId) {
      clauses.push(`project_id = $${idx++}`);
      values.push(input.projectId);
    }
    if (input?.threadId) {
      clauses.push(`thread_id = $${idx++}`);
      values.push(input.threadId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    values.push(limit);
    const rows = (await this.client!.query(
      `SELECT id, bucket, key, tenant_id, workspace_id, project_id, thread_id, mime_type, size, checksum_sha256, metadata_json, created_at
       FROM cockpit_object_storage_pg
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx}`,
      values,
    ))?.rows || [];
    return rows.map((row: any) => ({
      id: String(row.id),
      bucket: String(row.bucket),
      key: String(row.key),
      tenantId: row?.tenant_id ? String(row.tenant_id) : undefined,
      workspaceId: row?.workspace_id ? String(row.workspace_id) : undefined,
      projectId: row?.project_id ? String(row.project_id) : undefined,
      threadId: row?.thread_id ? String(row.thread_id) : undefined,
      mimeType: String(row.mime_type),
      size: Number(row.size || 0),
      checksumSha256: String(row.checksum_sha256),
      createdAt: String(row.created_at || new Date().toISOString()),
      metadata: (row?.metadata_json && typeof row.metadata_json === 'object') ? row.metadata_json : {},
    }));
  }
}
