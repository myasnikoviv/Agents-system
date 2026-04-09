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
