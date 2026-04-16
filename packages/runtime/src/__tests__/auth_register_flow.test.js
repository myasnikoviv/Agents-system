"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const HOST = '127.0.0.1';
const PORT = 3311;
const BASE_URL = `http://${HOST}:${PORT}`;
async function waitForHealth(timeoutMs = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            // Readiness check: backend socket is up and responding, even if health payload reports internal issues.
            if (res.status >= 100)
                return;
        }
        catch {
            // keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('backend_health_timeout');
}
describe('auth register/login flow (AGSYS-26R1)', () => {
    let backend = null;
    beforeAll(async () => {
        backend = (0, child_process_1.spawn)(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'src/server/agentSystemBackend.ts'], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                HOST,
                AGENT_SYSTEM_BACKEND_PORT: String(PORT),
                AUTH_MODE: 'required',
            },
            stdio: 'pipe',
        });
        await waitForHealth();
    }, 45000);
    afterAll(async () => {
        if (backend && !backend.killed) {
            backend.kill('SIGTERM');
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (!backend.killed)
                backend.kill('SIGKILL');
        }
    });
    it('registers, logs in, and enforces auth on protected endpoints', async () => {
        const email = `agsys26r1_${Date.now()}@example.com`;
        const register = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'test-pass-123',
                tenantId: 'tenant:agsys26r1',
                workspaceId: 'workspace:agsys26r1',
            }),
        });
        expect(register.status).toBe(201);
        const registerJson = await register.json();
        expect(registerJson?.success).toBe(true);
        expect(registerJson?.user?.tenantId).toBe('tenant:agsys26r1');
        expect(registerJson?.user?.workspaceId).toBe('workspace:agsys26r1');
        const duplicate = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'test-pass-123',
                tenantId: 'tenant:agsys26r1',
                workspaceId: 'workspace:agsys26r1',
            }),
        });
        expect(duplicate.status).toBe(409);
        const unauthorizedProtected = await fetch(`${BASE_URL}/api/cockpit/environments`);
        expect(unauthorizedProtected.status).toBe(401);
        const login = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password: 'test-pass-123' }),
        });
        expect(login.status).toBe(200);
        const loginJson = await login.json();
        expect(loginJson?.success).toBe(true);
        expect(typeof loginJson?.token).toBe('string');
        const authorizedProtected = await fetch(`${BASE_URL}/api/cockpit/environments`, {
            headers: { authorization: `Bearer ${loginJson.token}` },
        });
        expect(authorizedProtected.status).toBe(200);
        const authorizedJson = await authorizedProtected.json();
        expect(authorizedJson?.success).toBe(true);
    }, 60000);
});
