"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));
const child_process_1 = require("child_process");
const ExternalExecutionAdapter_1 = require("../ExternalExecutionAdapter");
function makeProc() {
    const proc = new events_1.EventEmitter();
    proc.stdout = new events_1.EventEmitter();
    proc.stderr = new events_1.EventEmitter();
    proc.kill = jest.fn();
    return proc;
}
describe('ExternalExecutionAdapter', () => {
    it('runs claude-code executor and returns stdout', async () => {
        const proc = makeProc();
        child_process_1.spawn.mockReturnValueOnce(proc);
        const p = (0, ExternalExecutionAdapter_1.runExternalExecutor)({
            executor: 'claude-code',
            prompt: 'hello',
            cwd: process.cwd(),
            timeoutMs: 5000,
        });
        proc.stdout.emit('data', 'ok-result');
        proc.emit('close', 0);
        const out = await p;
        expect(out.ok).toBe(true);
        expect(out.exitCode).toBe(0);
        expect(out.stdout).toContain('ok-result');
    });
    it('returns failure on non-zero exit', async () => {
        const proc = makeProc();
        child_process_1.spawn.mockReturnValueOnce(proc);
        const p = (0, ExternalExecutionAdapter_1.runExternalExecutor)({
            executor: 'claude-code',
            prompt: 'fail-case',
            cwd: process.cwd(),
            timeoutMs: 5000,
        });
        proc.stderr.emit('data', 'bad');
        proc.emit('close', 2);
        const out = await p;
        expect(out.ok).toBe(false);
        expect(out.exitCode).toBe(2);
        expect(out.stderr).toContain('bad');
    });
    it('builds codex-cli execution path', async () => {
        const proc = makeProc();
        child_process_1.spawn.mockReturnValueOnce(proc);
        const p = (0, ExternalExecutionAdapter_1.runExternalExecutor)({
            executor: 'codex-cli',
            prompt: 'say hi',
            cwd: '/tmp',
            timeoutMs: 5000,
            model: 'gpt-5.3-codex',
            binaryPath: 'codex',
            sandbox: 'workspace-write',
        });
        proc.stdout.emit('data', '{"type":"result","text":"ok"}');
        proc.emit('close', 0);
        const out = await p;
        expect(out.ok).toBe(true);
        const call = child_process_1.spawn.mock.calls.at(-1);
        expect(call?.[0]).toBe('codex');
        expect(call?.[1]).toContain('exec');
        expect(call?.[1]).toContain('--model');
    });
});
