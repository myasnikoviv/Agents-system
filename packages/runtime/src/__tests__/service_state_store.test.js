"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ServiceStateStore_1 = require("../control-plane/ServiceStateStore");
describe('ServiceStateStore (AGSYS-2704)', () => {
    it('stores and retrieves state in memory', () => {
        const store = new ServiceStateStore_1.InMemoryServiceStateStore();
        store.upsert({
            serviceId: 'backend',
            desired: 'running',
            status: 'healthy',
            restartCount: 1,
            lastCheckAt: '2026-04-09T00:00:00.000Z',
            errorReason: null,
        });
        const row = store.get('backend');
        expect(row?.status).toBe('healthy');
        expect(row?.restartCount).toBe(1);
        expect(store.list().length).toBe(1);
    });
    it('persists and restores state via sqlite store', () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'control-plane-state-'));
        const dbPath = path_1.default.join(tmpDir, 'state.db');
        const storeA = new ServiceStateStore_1.SqliteServiceStateStore(dbPath);
        storeA.upsert({
            serviceId: 'runtime-dispatcher',
            desired: 'running',
            status: 'failed',
            restartCount: 3,
            lastCheckAt: '2026-04-09T00:00:01.000Z',
            errorReason: 'timeout',
        });
        const storeB = new ServiceStateStore_1.SqliteServiceStateStore(dbPath);
        const restored = storeB.get('runtime-dispatcher');
        expect(restored?.status).toBe('failed');
        expect(restored?.restartCount).toBe(3);
        expect(restored?.errorReason).toBe('timeout');
        fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
    });
});
