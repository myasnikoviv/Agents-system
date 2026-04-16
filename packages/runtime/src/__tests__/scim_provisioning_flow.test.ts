import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const HOST = '127.0.0.1';
const PORT = 3315;
const BASE_URL = `http://${HOST}:${PORT}`;

async function waitForHealth(timeoutMs = 30000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status >= 100) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('backend_health_timeout');
}

describe('SCIM provisioning flow (AGSYS-3104)', () => {
  let backend: ChildProcessWithoutNullStreams | null = null;

  beforeAll(async () => {
    backend = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['tsx', 'src/server/agentSystemBackend.ts'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HOST,
          AGENT_SYSTEM_BACKEND_PORT: String(PORT),
          AUTH_MODE: 'required',
        },
        stdio: 'pipe',
      },
    );
    await waitForHealth();
  }, 45000);

  afterAll(async () => {
    if (backend && !backend.killed) {
      backend.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!backend.killed) backend.kill('SIGKILL');
    }
  });

  it('creates, updates and deactivates user via SCIM provider with tenant sync', async () => {
    const adminEmail = `admin_scim_${Date.now()}@example.com`;
    const tenantId = 'tenant:agsys3104';
    const workspaceId = 'workspace:agsys3104';

    const register = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'admin-pass-3104',
        tenantId,
        workspaceId,
        role: 'owner',
      }),
    });
    expect(register.status).toBe(201);

    const login = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'admin-pass-3104' }),
    });
    expect(login.status).toBe(200);
    const loginJson: any = await login.json();
    const adminToken = String(loginJson?.token || '');
    expect(adminToken).toBeTruthy();

    const scimToken = `scim-token-${Date.now()}`;
    const createProvider = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Okta SCIM',
        protocol: 'oidc',
        issuer: 'https://okta.example.com',
        scimToken,
      }),
    });
    expect(createProvider.status).toBe(201);
    const providerJson: any = await createProvider.json();
    const providerId = String(providerJson?.provider?.id || '');
    expect(providerId).toBeTruthy();

    const provisionEmail = `scim_user_${Date.now()}@example.com`;
    const createUser = await fetch(`${BASE_URL}/api/auth/scim/v2/Users`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${scimToken}`,
        'x-scim-provider-id': providerId,
      },
      body: JSON.stringify({
        email: provisionEmail,
        role: 'member',
        active: true,
      }),
    });
    expect(createUser.status).toBe(201);
    const createUserJson: any = await createUser.json();
    expect(createUserJson?.success).toBe(true);
    expect(createUserJson?.user?.tenantId).toBe(tenantId);
    expect(createUserJson?.user?.workspaceId).toBe(workspaceId);
    const userId = String(createUserJson?.user?.id || '');
    expect(userId).toBeTruthy();

    const updateUser = await fetch(`${BASE_URL}/api/auth/scim/v2/Users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${scimToken}`,
        'x-scim-provider-id': providerId,
      },
      body: JSON.stringify({
        role: 'admin',
      }),
    });
    expect(updateUser.status).toBe(200);
    const updateJson: any = await updateUser.json();
    expect(updateJson?.success).toBe(true);
    expect(updateJson?.user?.role).toBe('admin');

    const deactivateUser = await fetch(`${BASE_URL}/api/auth/scim/v2/Users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${scimToken}`,
        'x-scim-provider-id': providerId,
      },
    });
    expect(deactivateUser.status).toBe(200);
    const deactivateJson: any = await deactivateUser.json();
    expect(deactivateJson?.success).toBe(true);
    expect(deactivateJson?.deactivated).toBe(true);

    const loginAfterDeactivate = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: provisionEmail, password: 'any-password' }),
    });
    expect(loginAfterDeactivate.status).toBe(401);
  }, 90000);
});
