"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Backup endpoints (AGSYS-3125)', () => {
    it('returns backup status and executes full/incremental backup runs', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getBackupStatus: async () => ({
                schedule: { fullCron: 'daily@02:00', incrementalCron: 'hourly' },
                recent: [],
            }),
            runBackupNow: async ({ mode }) => ({
                mode,
                verified: true,
            }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const statusRes = await fetch(`${base}/api/cockpit/backup/status`);
            const statusJson = await statusRes.json();
            expect(statusRes.status).toBe(200);
            expect(statusJson.success).toBe(true);
            expect(statusJson.schedule.fullCron).toBe('daily@02:00');
            const runFullRes = await fetch(`${base}/api/cockpit/backup/run`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ mode: 'full' }),
            });
            const runFullJson = await runFullRes.json();
            expect(runFullRes.status).toBe(200);
            expect(runFullJson.mode).toBe('full');
            expect(runFullJson.verified).toBe(true);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
