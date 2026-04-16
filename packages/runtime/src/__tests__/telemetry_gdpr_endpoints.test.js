"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('GDPR endpoints (AGSYS-3128)', () => {
    it('supports delete/export/consent flow', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            gdprDelete: async ({ subjectId }) => ({ subjectId, deleted: true }),
            gdprExport: async ({ subjectId }) => ({ subjectId, export: {} }),
            gdprTrackConsent: async ({ subjectId, consent }) => ({ subjectId, consent }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const consent = await fetch(`${base}/api/cockpit/gdpr/consent`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ subjectId: 'u-1', consent: true }),
            });
            expect(consent.status).toBe(200);
            const exp = await fetch(`${base}/api/cockpit/gdpr/export`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ subjectId: 'u-1' }),
            });
            expect(exp.status).toBe(200);
            const del = await fetch(`${base}/api/cockpit/gdpr/delete`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ subjectId: 'u-1' }),
            });
            const delJson = await del.json();
            expect(del.status).toBe(200);
            expect(delJson.deleted).toBe(true);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
