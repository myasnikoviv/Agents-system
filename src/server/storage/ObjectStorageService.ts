import crypto from 'crypto';
import type Database from 'better-sqlite3';

export interface StoredObjectRecord {
  id: string;
  bucket: string;
  key: string;
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
      CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_project_thread
        ON cockpit_object_storage(project_id, thread_id, created_at);
    `);
  }

  putObject(input: {
    bucket?: string;
    key?: string;
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
        id, bucket, key, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
      ) VALUES (@id, @bucket, @key, @project_id, @thread_id, @mime_type, @size, @checksum_sha256, @content_base64, @metadata_json, @created_at)
    `).run({
      id,
      bucket,
      key,
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
      projectId: input.projectId,
      threadId: input.threadId,
      mimeType,
      size: raw.length,
      checksumSha256,
      createdAt,
      metadata,
    };
  }

  getObject(id: string): StoredObjectPayload | null {
    const row = this.db.prepare(`
      SELECT id, bucket, key, project_id, thread_id, mime_type, size, checksum_sha256, content_base64, metadata_json, created_at
      FROM cockpit_object_storage
      WHERE id = ?
      LIMIT 1
    `).get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      bucket: row.bucket,
      key: row.key,
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
      SELECT id, bucket, key, project_id, thread_id, mime_type, size, checksum_sha256, metadata_json, created_at
      FROM cockpit_object_storage
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...values, limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      bucket: row.bucket,
      key: row.key,
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
