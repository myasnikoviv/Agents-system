"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telemetryRoutes_1 = require("../../server/routes/telemetryRoutes");
describe('Restore endpoints (AGSYS-3126)', () => {
    it('returns restore status and executes restore run', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        (0, telemetryRoutes_1.registerTelemetryRoutes)(app, {
            fetchRecentEvents: async () => [],
            readControlActionAuditRows: async () => [],
            readRunLedgerEvents: async () => [],
            normalizeRuntimeEvent: (row) => row,
            normalizeAuditRow: (row) => row,
            getRestoreStatus: async () => ({ recent: [] }),
            runRestoreNow: async () => ({ checksumMatch: true }),
        });
        const server = await new Promise((resolve) => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        const { port } = server.address();
        const base = `http://127.0.0.1:${port}`;
        try {
            const status = await fetch(`${base}/api/cockpit/restore/status`);
            const statusJson = await status.json();
            expect(status.status).toBe(200);
            expect(statusJson.success).toBe(true);
            const run = await fetch(`${base}/api/cockpit/restore/run`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({}),
            });
            const runJson = await run.json();
            expect(run.status).toBe(200);
            expect(runJson.success).toBe(true);
            expect(runJson.checksumMatch).toBe(true);
        }
        finally {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
