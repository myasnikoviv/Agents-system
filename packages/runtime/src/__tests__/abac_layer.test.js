"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const HOST = '127.0.0.1';
const PORT = 3317;
const BASE_URL = `http://${HOST}:${PORT}`;
async function waitForHealth(timeoutMs = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            if (res.status >= 100)
                return;
        }
        catch { }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('backend_health_timeout');
}
describe('ABAC layer (AGSYS-3106)', () => {
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
    it('evaluates context-aware policies and enforces them at runtime', async () => {
        const stamp = Date.now();
        const email = `abac_admin_${stamp}@example.com`;
        const tenantId = 'tenant:agsys3106';
        const workspaceId = 'workspace:agsys3106';
        const password = 'abac-pass-3106';
        const register = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                tenantId,
                workspaceId,
                role: 'admin',
            }),
        });
        expect(register.status).toBe(201);
        const login = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        expect(login.status).toBe(200);
        const loginJson = await login.json();
        const token = String(loginJson?.token || '');
        expect(token).toBeTruthy();
        const policies = await fetch(`${BASE_URL}/api/auth/abac/policies`, {
            headers: { authorization: `Bearer ${token}` },
        });
        expect(policies.status).toBe(200);
        const policiesJson = await policies.json();
        expect(Array.isArray(policiesJson?.policies)).toBe(true);
        expect(policiesJson.policies.length).toBeGreaterThan(0);
        const allowDecision = await fetch(`${BASE_URL}/api/auth/abac/evaluate`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                action: 'config:write',
                tenantId,
                workspaceId,
            }),
        });
        expect(allowDecision.status).toBe(200);
        const allowJson = await allowDecision.json();
        expect(allowJson?.decision?.allowed).toBe(true);
        const denyDecision = await fetch(`${BASE_URL}/api/auth/abac/evaluate`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                action: 'config:write',
                tenantId: 'tenant:other',
                workspaceId,
            }),
        });
        expect(denyDecision.status).toBe(200);
        const denyJson = await denyDecision.json();
        expect(denyJson?.decision?.allowed).toBe(false);
        expect(denyJson?.decision?.reason).toBe('tenant_scope_violation');
        const deniedMutation = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: 'Blocked by ABAC context',
                protocol: 'oidc',
                tenantId: 'tenant:other',
            }),
        });
        expect(deniedMutation.status).toBe(403);
        const deniedJson = await deniedMutation.json();
        expect(deniedJson?.error).toBe('abac_forbidden');
        const allowedMutation = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: 'Allowed by ABAC',
                protocol: 'oidc',
            }),
        });
        expect(allowedMutation.status).toBe(201);
    }, 120000);
});
