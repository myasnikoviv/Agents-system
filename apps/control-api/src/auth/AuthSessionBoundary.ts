import crypto from 'crypto';
import type express from 'express';

type AuthStoreContract = {
  createSession: (input: {
    token: string;
    userId: string;
    tenantId: string;
    workspaceId: string;
    refreshTokenHash?: string | null;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: string;
  }) => Promise<void>;
  findSessionByTokenWithUser: (token: string) => Promise<{
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
  } | null>;
  deleteSessionByToken: (token: string) => Promise<void>;
};

export function createAuthSessionBoundary(input: {
  authSecret: string;
  authSessionTtlHours: number;
  authStore: AuthStoreContract;
}) {
  const hashPassword = (raw: string): string =>
    crypto.createHash('sha256').update(`${input.authSecret}:${String(raw || '')}`).digest('hex');

  const hashRefreshToken = (raw: string): string =>
    crypto.createHash('sha256').update(`${input.authSecret}:refresh:${String(raw || '')}`).digest('hex');

  const createSessionToken = (prefix: 'sess' | 'refresh'): string =>
    `${prefix}_${crypto.randomUUID()}_${crypto.randomBytes(12).toString('hex')}`;

  const parseBearerToken = (headerValue?: string): string => {
    const header = String(headerValue || '').trim();
    if (!header.toLowerCase().startsWith('bearer ')) return '';
    return header.slice(7).trim();
  };

  const parseScimBearerToken = (req: express.Request): string => {
    const header = String(req.header('authorization') || '').trim();
    if (!header.toLowerCase().startsWith('bearer ')) return '';
    return header.slice(7).trim();
  };

  const createAuthSession = async (sessionInput: {
    userId: string;
    tenantId: string;
    workspaceId: string;
    userAgent?: string;
    ipAddress?: string;
  }) => {
    const token = createSessionToken('sess');
    const refreshToken = createSessionToken('refresh');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + input.authSessionTtlHours * 60 * 60 * 1000).toISOString();
    await input.authStore.createSession({
      token,
      userId: sessionInput.userId,
      tenantId: sessionInput.tenantId,
      workspaceId: sessionInput.workspaceId,
      refreshTokenHash,
      expiresAt,
      userAgent: String(sessionInput.userAgent || '').slice(0, 512),
      ipAddress: String(sessionInput.ipAddress || '').slice(0, 128),
    });
    return { token, refreshToken, expiresAt };
  };

  const getAuthContextPg = async (req: express.Request): Promise<{
    userId: string;
    email: string;
    tenantId: string;
    workspaceId: string;
    role: string;
    token: string;
  } | null> => {
    const token = parseBearerToken(req.header('authorization'));
    if (!token) return null;
    const row = await input.authStore.findSessionByTokenWithUser(token);
    if (!row || !row.is_active) return null;
    if (row.revoked_at) {
      await input.authStore.deleteSessionByToken(token);
      return null;
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await input.authStore.deleteSessionByToken(token);
      return null;
    }
    return {
      userId: row.user_id,
      email: row.email,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      role: row.role,
      token: row.token,
    };
  };

  return {
    hashPassword,
    hashRefreshToken,
    createSessionToken,
    parseBearerToken,
    parseScimBearerToken,
    createAuthSession,
    getAuthContextPg,
  };
}
