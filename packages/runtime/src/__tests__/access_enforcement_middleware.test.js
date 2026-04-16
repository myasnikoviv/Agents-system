"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const HOST = '127.0.0.1';
const PORT = 3318;
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
describe('Access enforcement middleware (AGSYS-3107)', () => {
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
    it('blocks protected endpoints consistently and allows via auth+role', async () => {
        const stamp = Date.now();
        const ownerEmail = `owner_mw_${stamp}@example.com`;
        const viewerEmail = `viewer_mw_${stamp}@example.com`;
        const tenantId = 'tenant:agsys3107';
        const workspaceId = 'workspace:agsys3107';
        const registerOwner = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: ownerEmail,
                password: 'owner-pass-3107',
                tenantId,
                workspaceId,
                role: 'owner',
            }),
        });
        expect(registerOwner.status).toBe(201);
        const registerViewer = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: viewerEmail,
                password: 'viewer-pass-3107',
                tenantId,
                workspaceId,
                role: 'viewer',
            }),
        });
        expect(registerViewer.status).toBe(201);
        const loginOwner = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password: 'owner-pass-3107' }),
        });
        const ownerJson = await loginOwner.json();
        const ownerToken = String(ownerJson?.token || '');
        expect(ownerToken).toBeTruthy();
        const loginViewer = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: viewerEmail, password: 'viewer-pass-3107' }),
        });
        const viewerJson = await loginViewer.json();
        const viewerToken = String(viewerJson?.token || '');
        expect(viewerToken).toBeTruthy();
        const noAuthGovernance = await fetch(`${BASE_URL}/api/governance/evaluators`);
        expect(noAuthGovernance.status).toBe(401);
        const noAuthSystem = await fetch(`${BASE_URL}/api/system/billing/domain-snapshot`);
        expect(noAuthSystem.status).toBe(401);
        const viewerGovernanceWrite = await fetch(`${BASE_URL}/api/governance/evaluators/register`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${viewerToken}`,
            },
            body: JSON.stringify({ evaluatorType: 'mw-deny', aliasTo: 'always-pass' }),
        });
        expect(viewerGovernanceWrite.status).toBe(403);
        const ownerGovernanceWrite = await fetch(`${BASE_URL}/api/governance/evaluators/register`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({ evaluatorType: `mw-allow-${stamp}`, aliasTo: 'always-pass' }),
        });
        expect(ownerGovernanceWrite.status).not.toBe(401);
        expect(ownerGovernanceWrite.status).not.toBe(403);
    }, 120000);
});
