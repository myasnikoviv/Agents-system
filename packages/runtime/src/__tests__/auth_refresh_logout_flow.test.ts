import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const HOST = '127.0.0.1';
const PORT = 3313;
const BASE_URL = `http://${HOST}:${PORT}`;

async function waitForHealth(timeoutMs = 30000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status >= 100) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('backend_health_timeout');
}

describe('auth refresh/logout flow (AGSYS-3102)', () => {
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

  it('supports token refresh rotation and logout invalidation', async () => {
    const email = `agsys3102_${Date.now()}@example.com`;
    const password = 'test-pass-3102';

    const register = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        tenantId: 'tenant:agsys3102',
        workspaceId: 'workspace:agsys3102',
      }),
    });
    expect(register.status).toBe(201);

    const login = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const loginJson: any = await login.json();
    expect(loginJson?.success).toBe(true);
    expect(typeof loginJson?.token).toBe('string');
    expect(typeof loginJson?.refreshToken).toBe('string');

    const meBeforeRefresh = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { authorization: `Bearer ${loginJson.token}` },
    });
    expect(meBeforeRefresh.status).toBe(200);

    const refresh = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginJson.refreshToken }),
    });
    expect(refresh.status).toBe(200);
    const refreshJson: any = await refresh.json();
    expect(refreshJson?.success).toBe(true);
    expect(typeof refreshJson?.token).toBe('string');
    expect(typeof refreshJson?.refreshToken).toBe('string');
    expect(refreshJson.token).not.toBe(loginJson.token);
    expect(refreshJson.refreshToken).not.toBe(loginJson.refreshToken);

    const oldTokenAccess = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { authorization: `Bearer ${loginJson.token}` },
    });
    expect(oldTokenAccess.status).toBe(401);

    const refreshedAccess = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { authorization: `Bearer ${refreshJson.token}` },
    });
    expect(refreshedAccess.status).toBe(200);

    const oldRefreshReuse = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginJson.refreshToken }),
    });
    expect(oldRefreshReuse.status).toBe(401);

    const logout = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${refreshJson.token}` },
    });
    expect(logout.status).toBe(200);
    const logoutJson: any = await logout.json();
    expect(logoutJson?.success).toBe(true);

    const postLogoutAccess = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { authorization: `Bearer ${refreshJson.token}` },
    });
    expect(postLogoutAccess.status).toBe(401);
  }, 90000);
});
