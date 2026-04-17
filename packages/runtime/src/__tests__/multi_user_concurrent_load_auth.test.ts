import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const HOST = '127.0.0.1';
const PORT = 3312;
const BASE_URL = `http://${HOST}:${PORT}`;

async function waitForBackend(timeoutMs = 30000): Promise<void> {
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
  throw new Error('backend_start_timeout');
}

async function registerAndLogin(index: number): Promise<{ token: string; tenantId: string; workspaceId: string; email: string }> {
  const tenantId = `tenant:s26r2:${index}`;
  const workspaceId = `workspace:s26r2:${index}`;
  const email = `s26r2_${Date.now()}_${index}@example.com`;
  const password = 'pass-1234';

  const reg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId, workspaceId }),
  });
  expect(reg.status).toBe(201);

  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(login.status).toBe(200);
  const loginJson: any = await login.json();
  expect(typeof loginJson?.token).toBe('string');

  return { token: loginJson.token, tenantId, workspaceId, email };
}

describe('AGSYS-26R2 multi-user concurrent load validation', () => {
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
    await waitForBackend();
  }, 45000);

  afterAll(async () => {
    if (backend && !backend.killed) {
      backend.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!backend.killed) backend.kill('SIGKILL');
    }
  });

  it('keeps 10 users isolated across env provisioning and status/telemetry', async () => {
    const users = await Promise.all(Array.from({ length: 10 }, (_, i) => registerAndLogin(i + 1)));

    const projectId = 's26r2-load';
    const provisionResults = await Promise.all(
      users.map(async (u) => {
        const provision = await fetch(`${BASE_URL}/api/cockpit/environments/provision`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${u.token}`,
          },
          body: JSON.stringify({ projectId }),
        });
        expect(provision.status).toBe(200);
        const provisionJson: any = await provision.json();
        expect(provisionJson?.success).toBe(true);

        const status = await fetch(`${BASE_URL}/api/cockpit/environments/status?projectId=${encodeURIComponent(projectId)}`, {
          headers: { authorization: `Bearer ${u.token}` },
        });
        expect(status.status).toBe(200);
        const statusJson: any = await status.json();
        expect(statusJson?.success).toBe(true);

        const telemetry = await fetch(`${BASE_URL}/api/cockpit/environments/telemetry?projectId=${encodeURIComponent(projectId)}&limit=20`, {
          headers: { authorization: `Bearer ${u.token}` },
        });
        expect(telemetry.status).toBe(200);

        return {
          tenantId: u.tenantId,
          workspaceId: u.workspaceId,
          environmentId: String(statusJson?.environment?.environmentId || ''),
        };
      }),
    );

    const envIds = provisionResults.map((row) => row.environmentId).filter(Boolean);
    expect(envIds.length).toBe(10);
    expect(new Set(envIds).size).toBe(10);

    const first = users[0];
    const second = users[1];
    const forbidden = await fetch(
      `${BASE_URL}/api/cockpit/environments/status?projectId=${encodeURIComponent(projectId)}&tenantId=${encodeURIComponent(second.tenantId)}&workspaceId=${encodeURIComponent(second.workspaceId)}`,
      { headers: { authorization: `Bearer ${first.token}` } },
    );
    expect(forbidden.status).toBe(403);
    const forbiddenJson: any = await forbidden.json();
    expect(forbiddenJson?.error).toBe('forbidden_cross_tenant_access');
  }, 90000);
});
