type Queryable = {
  query: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>;
};

export type AuthUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  tenant_id: string;
  workspace_id: string;
  role: string;
  is_active: boolean;
  created_at?: string;
};

export type AuthSessionWithUser = {
  token: string;
  user_id: string;
  tenant_id: string;
  workspace_id: string;
  refresh_token_hash?: string | null;
  revoked_at?: string | null;
  expires_at: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type AuthSsoProviderRecord = {
  id: string;
  name: string;
  protocol: string;
  issuer?: string | null;
  entrypoint?: string | null;
  audience?: string | null;
  tenant_id: string;
  workspace_id: string;
  client_id?: string | null;
  client_secret_hash?: string | null;
  scim_token_hash?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export class PostgresAuthStore {
  constructor(private readonly client: Queryable) {}

  async ensureSchema(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS auth_users_pg (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_pg_email_scope
        ON auth_users_pg(email, tenant_id, workspace_id);
      CREATE TABLE IF NOT EXISTS auth_sessions_pg (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        refresh_token_hash TEXT,
        revoked_at TIMESTAMPTZ,
        user_agent TEXT,
        ip_address TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_pg_user ON auth_sessions_pg(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_pg_refresh ON auth_sessions_pg(refresh_token_hash);
      CREATE TABLE IF NOT EXISTS auth_sso_providers_pg (
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
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_auth_sso_providers_pg_scope
        ON auth_sso_providers_pg(tenant_id, workspace_id, protocol);
    `);
  }

  async getUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const result = await this.client.query(
      `SELECT id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at
       FROM auth_users_pg
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthUserRecord) : null;
  }

  async getUserByEmailScoped(email: string, tenantId: string, workspaceId: string): Promise<AuthUserRecord | null> {
    const result = await this.client.query(
      `SELECT id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at
       FROM auth_users_pg
       WHERE email = $1 AND tenant_id = $2 AND workspace_id = $3
       LIMIT 1`,
      [email, tenantId, workspaceId],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthUserRecord) : null;
  }

  async getUserByIdScoped(userId: string, tenantId: string, workspaceId: string): Promise<AuthUserRecord | null> {
    const result = await this.client.query(
      `SELECT id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at
       FROM auth_users_pg
       WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3
       LIMIT 1`,
      [userId, tenantId, workspaceId],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthUserRecord) : null;
  }

  async countUsers(): Promise<number> {
    const result = await this.client.query(`SELECT COUNT(*)::int AS c FROM auth_users_pg`);
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return Number(row?.c || 0);
  }

  async createUser(input: {
    id: string;
    email: string;
    passwordHash: string;
    tenantId: string;
    workspaceId: string;
    role: string;
    isActive: boolean;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO auth_users_pg(id, email, password_hash, tenant_id, workspace_id, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [input.id, input.email, input.passwordHash, input.tenantId, input.workspaceId, input.role, input.isActive],
    );
  }

  async updateUserRoleActive(userId: string, role: string, isActive: boolean): Promise<void> {
    await this.client.query(
      `UPDATE auth_users_pg
       SET role = $1, is_active = $2
       WHERE id = $3`,
      [role, isActive, userId],
    );
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.client.query(`UPDATE auth_users_pg SET is_active = FALSE WHERE id = $1`, [userId]);
  }

  async createSession(input: {
    token: string;
    userId: string;
    tenantId: string;
    workspaceId: string;
    refreshTokenHash?: string | null;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: string;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO auth_sessions_pg(
         token, user_id, tenant_id, workspace_id, refresh_token_hash, revoked_at, user_agent, ip_address, expires_at, created_at
       ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8::timestamptz, NOW())`,
      [
        input.token,
        input.userId,
        input.tenantId,
        input.workspaceId,
        input.refreshTokenHash || null,
        input.userAgent || null,
        input.ipAddress || null,
        input.expiresAt,
      ],
    );
  }

  async deleteSessionByToken(token: string): Promise<void> {
    await this.client.query(`DELETE FROM auth_sessions_pg WHERE token = $1`, [token]);
  }

  async deleteSessionsByUser(userId: string): Promise<void> {
    await this.client.query(`DELETE FROM auth_sessions_pg WHERE user_id = $1`, [userId]);
  }

  async findSessionByTokenWithUser(token: string): Promise<AuthSessionWithUser | null> {
    const result = await this.client.query(
      `SELECT s.token, s.user_id, s.tenant_id, s.workspace_id, s.refresh_token_hash, s.revoked_at, s.expires_at,
              u.email, u.role, u.is_active
       FROM auth_sessions_pg s
       JOIN auth_users_pg u ON u.id = s.user_id
       WHERE s.token = $1
       LIMIT 1`,
      [token],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthSessionWithUser) : null;
  }

  async findSessionByRefreshHashWithUser(refreshTokenHash: string): Promise<AuthSessionWithUser | null> {
    const result = await this.client.query(
      `SELECT s.token, s.user_id, s.tenant_id, s.workspace_id, s.refresh_token_hash, s.revoked_at, s.expires_at,
              u.email, u.role, u.is_active
       FROM auth_sessions_pg s
       JOIN auth_users_pg u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
       LIMIT 1`,
      [refreshTokenHash],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthSessionWithUser) : null;
  }

  async rotateSessionToken(input: {
    oldToken: string;
    newToken: string;
    newRefreshTokenHash: string;
    expiresAt: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.client.query(
      `UPDATE auth_sessions_pg
       SET token = $1,
           refresh_token_hash = $2,
           expires_at = $3::timestamptz,
           user_agent = $4,
           ip_address = $5,
           revoked_at = NULL
       WHERE token = $6`,
      [input.newToken, input.newRefreshTokenHash, input.expiresAt, input.userAgent || null, input.ipAddress || null, input.oldToken],
    );
  }

  async listSsoProviders(tenantId: string, workspaceId: string): Promise<AuthSsoProviderRecord[]> {
    const result = await this.client.query(
      `SELECT id, name, protocol, issuer, entrypoint, audience, tenant_id, workspace_id, client_id, client_secret_hash, scim_token_hash, active, created_at, updated_at
       FROM auth_sso_providers_pg
       WHERE tenant_id = $1 AND workspace_id = $2
       ORDER BY protocol ASC, name ASC`,
      [tenantId, workspaceId],
    );
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return rows as AuthSsoProviderRecord[];
  }

  async getSsoProviderById(providerId: string): Promise<AuthSsoProviderRecord | null> {
    const result = await this.client.query(
      `SELECT id, name, protocol, issuer, entrypoint, audience, tenant_id, workspace_id, client_id, client_secret_hash, scim_token_hash, active, created_at, updated_at
       FROM auth_sso_providers_pg
       WHERE id = $1
       LIMIT 1`,
      [providerId],
    );
    const row = Array.isArray(result?.rows) ? result.rows[0] : null;
    return row ? (row as AuthSsoProviderRecord) : null;
  }

  async createSsoProvider(input: {
    id: string;
    name: string;
    protocol: string;
    issuer?: string;
    entrypoint?: string;
    audience?: string;
    tenantId: string;
    workspaceId: string;
    clientId?: string;
    clientSecretHash?: string;
    scimTokenHash?: string;
    active: boolean;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO auth_sso_providers_pg(
         id, name, protocol, issuer, entrypoint, audience, tenant_id, workspace_id, client_id, client_secret_hash, scim_token_hash, active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        input.id,
        input.name,
        input.protocol,
        input.issuer || null,
        input.entrypoint || null,
        input.audience || null,
        input.tenantId,
        input.workspaceId,
        input.clientId || null,
        input.clientSecretHash || null,
        input.scimTokenHash || null,
        input.active,
      ],
    );
  }
}
