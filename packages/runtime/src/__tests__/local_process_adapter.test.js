"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const LocalProcessAdapter_1 = require("../control-api/LocalProcessAdapter");
describe('LocalProcessAdapter (AGSYS-2707)', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'local-process-adapter-'));
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch {
            // no-op
        }
    });
    it('starts process, tracks pid, and logs stdout/stderr', async () => {
        const adapter = new LocalProcessAdapter_1.LocalProcessAdapter();
        const runtime = await adapter.start('echo-service', {
            command: process.execPath,
            args: ['-e', "console.log('hello'); console.error('warn'); setTimeout(() => process.exit(0), 50)"],
            logDir: tmpDir,
        });
        expect(runtime.status).toBe('running');
        expect(runtime.pid).toBeTruthy();
        await new Promise((resolve) => setTimeout(resolve, 180));
        const after = adapter.getRuntime('echo-service');
        expect(after.status).toBe('stopped');
        const logFile = path_1.default.join(tmpDir, 'echo-service.log');
        const content = fs_1.default.readFileSync(logFile, 'utf-8');
        expect(content).toContain('[stdout] hello');
        expect(content).toContain('[stderr] warn');
    });
    it('detects unexpected crash', async () => {
        const adapter = new LocalProcessAdapter_1.LocalProcessAdapter();
        await adapter.start('crash-service', {
            command: process.execPath,
            args: ['-e', 'setTimeout(() => process.exit(2), 30)'],
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
        const runtime = adapter.getRuntime('crash-service');
        expect(runtime.status).toBe('crashed');
        expect(runtime.exitCode).toBe(2);
        expect(runtime.crashReason).toContain('process_exited_unexpectedly');
    });
    it('supports stop and restart lifecycle', async () => {
        const adapter = new LocalProcessAdapter_1.LocalProcessAdapter();
        await adapter.start('loop-service', {
            command: process.execPath,
            args: ['-e', 'setInterval(() => {}, 1000)'],
        });
        expect(adapter.isRunning('loop-service')).toBe(true);
        const stopped = await adapter.stop('loop-service');
        expect(stopped.status).toBe('stopped');
        const restarted = await adapter.restart('loop-service', {
            command: process.execPath,
            args: ['-e', 'setInterval(() => {}, 1000)'],
        });
        expect(restarted.status).toBe('running');
        expect(restarted.pid).toBeTruthy();
        await adapter.stop('loop-service');
    });
});
