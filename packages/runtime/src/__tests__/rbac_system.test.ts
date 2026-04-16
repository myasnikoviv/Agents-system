import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

const HOST = '127.0.0.1';
const PORT = 3316;
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

async function registerAndLogin(input: {
  email: string;
  password: string;
  tenantId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}): Promise<string> {
  const register = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  expect(register.status).toBe(201);
  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  expect(login.status).toBe(200);
  const loginJson: any = await login.json();
  expect(typeof loginJson?.token).toBe('string');
  return loginJson.token;
}

describe('RBAC system (AGSYS-3105)', () => {
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

  it('enforces owner/admin/member/viewer permission matrix on API level', async () => {
    const tenantId = 'tenant:agsys3105';
    const workspaceId = 'workspace:agsys3105';
    const password = 'rbac-pass-3105';
    const stamp = Date.now();

    const ownerToken = await registerAndLogin({
      email: `owner_${stamp}@example.com`,
      password,
      tenantId,
      workspaceId,
      role: 'owner',
    });
    const adminToken = await registerAndLogin({
      email: `admin_${stamp}@example.com`,
      password,
      tenantId,
      workspaceId,
      role: 'admin',
    });
    const memberToken = await registerAndLogin({
      email: `member_${stamp}@example.com`,
      password,
      tenantId,
      workspaceId,
      role: 'member',
    });
    const viewerToken = await registerAndLogin({
      email: `viewer_${stamp}@example.com`,
      password,
      tenantId,
      workspaceId,
      role: 'viewer',
    });

    const matrixAsMember = await fetch(`${BASE_URL}/api/auth/rbac/matrix`, {
      headers: { authorization: `Bearer ${memberToken}` },
    });
    expect(matrixAsMember.status).toBe(200);
    const matrixJson: any = await matrixAsMember.json();
    expect(matrixJson?.success).toBe(true);
    expect(Array.isArray(matrixJson?.matrix?.viewer)).toBe(true);

    const viewerRuntimeRead = await fetch(`${BASE_URL}/api/system/billing/domain-snapshot`, {
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(viewerRuntimeRead.status).toBe(403);

    const viewerAdminWrite = await fetch(`${BASE_URL}/api/cockpit/runtime-footer`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({ label: 'blocked' }),
    });
    expect(viewerAdminWrite.status).toBe(403);

    const memberRuntimeRead = await fetch(`${BASE_URL}/api/system/billing/domain-snapshot`, {
      headers: { authorization: `Bearer ${memberToken}` },
    });
    expect(memberRuntimeRead.status).toBe(200);

    const memberAdminWrite = await fetch(`${BASE_URL}/api/cockpit/runtime-footer`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ label: 'blocked-for-member' }),
    });
    expect(memberAdminWrite.status).toBe(403);

    const adminWrite = await fetch(`${BASE_URL}/api/cockpit/runtime-footer`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ label: 'admin-ok' }),
    });
    expect(adminWrite.status).toBe(200);

    const ownerOnlyFromAdmin = await fetch(`${BASE_URL}/api/governance/evaluators/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ evaluatorType: 'x-custom', aliasTo: 'always-pass' }),
    });
    expect(ownerOnlyFromAdmin.status).toBe(403);

    const ownerOnlyFromOwner = await fetch(`${BASE_URL}/api/governance/evaluators/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ evaluatorType: 'x-custom-2', aliasTo: 'always-pass' }),
    });
    expect(ownerOnlyFromOwner.status).not.toBe(403);
  }, 120000);
});
