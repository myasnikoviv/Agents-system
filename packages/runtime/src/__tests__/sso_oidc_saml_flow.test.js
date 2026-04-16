"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const HOST = '127.0.0.1';
const PORT = 3314;
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
describe('SSO OIDC/SAML flow (AGSYS-3103)', () => {
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
    it('supports multiple providers and maps SSO user into provider tenant/workspace', async () => {
        const adminEmail = `admin_sso_${Date.now()}@example.com`;
        const tenantId = 'tenant:agsys3103';
        const workspaceId = 'workspace:agsys3103';
        const register = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: adminEmail,
                password: 'admin-pass-3103',
                tenantId,
                workspaceId,
                role: 'owner',
            }),
        });
        expect(register.status).toBe(201);
        const login = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: 'admin-pass-3103' }),
        });
        expect(login.status).toBe(200);
        const loginJson = await login.json();
        const adminToken = String(loginJson?.token || '');
        expect(adminToken).toBeTruthy();
        const createOidc = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: 'Google Workspace OIDC',
                protocol: 'oidc',
                issuer: 'https://accounts.google.com',
                audience: 'agsys-app',
                clientId: 'oidc-client',
                clientSecret: 'oidc-secret',
            }),
        });
        expect(createOidc.status).toBe(201);
        const oidcJson = await createOidc.json();
        const oidcProviderId = String(oidcJson?.provider?.id || '');
        expect(oidcProviderId).toBeTruthy();
        const createSaml = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: 'Okta SAML',
                protocol: 'saml',
                entrypoint: 'https://okta.example.com/sso/saml',
                audience: 'agsys-app',
            }),
        });
        expect(createSaml.status).toBe(201);
        const samlJson = await createSaml.json();
        const samlProviderId = String(samlJson?.provider?.id || '');
        expect(samlProviderId).toBeTruthy();
        expect(samlProviderId).not.toBe(oidcProviderId);
        const listProviders = await fetch(`${BASE_URL}/api/auth/sso/providers`, {
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(listProviders.status).toBe(200);
        const listJson = await listProviders.json();
        expect(Array.isArray(listJson?.items)).toBe(true);
        expect(listJson.items.length).toBeGreaterThanOrEqual(2);
        const ssoEmail = `sso_user_${Date.now()}@example.com`;
        const oidcLogin = await fetch(`${BASE_URL}/api/auth/sso/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                providerId: oidcProviderId,
                protocol: 'oidc',
                email: ssoEmail,
            }),
        });
        expect(oidcLogin.status).toBe(200);
        const oidcLoginJson = await oidcLogin.json();
        expect(oidcLoginJson?.success).toBe(true);
        expect(oidcLoginJson?.user?.tenantId).toBe(tenantId);
        expect(oidcLoginJson?.user?.workspaceId).toBe(workspaceId);
        expect(oidcLoginJson?.sso?.protocol).toBe('oidc');
        const samlLogin = await fetch(`${BASE_URL}/api/auth/sso/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                providerId: samlProviderId,
                protocol: 'saml',
                email: `saml_user_${Date.now()}@example.com`,
            }),
        });
        expect(samlLogin.status).toBe(200);
        const samlLoginJson = await samlLogin.json();
        expect(samlLoginJson?.success).toBe(true);
        expect(samlLoginJson?.user?.tenantId).toBe(tenantId);
        expect(samlLoginJson?.user?.workspaceId).toBe(workspaceId);
        expect(samlLoginJson?.sso?.protocol).toBe('saml');
    }, 90000);
});
