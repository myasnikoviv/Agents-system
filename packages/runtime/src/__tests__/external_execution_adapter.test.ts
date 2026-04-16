import { EventEmitter } from 'events';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

import { spawn } from 'child_process';
import { runExternalExecutor } from '../ExternalExecutionAdapter';

type MockProc = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: jest.Mock;
};

function makeProc(): MockProc {
  const proc = new EventEmitter() as MockProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = jest.fn();
  return proc;
}

describe('ExternalExecutionAdapter', () => {
  it('runs claude-code executor and returns stdout', async () => {
    const proc = makeProc();
    (spawn as unknown as jest.Mock).mockReturnValueOnce(proc);

    const p = runExternalExecutor({
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
    (spawn as unknown as jest.Mock).mockReturnValueOnce(proc);

    const p = runExternalExecutor({
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
    (spawn as unknown as jest.Mock).mockReturnValueOnce(proc);

    const p = runExternalExecutor({
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
    const call = (spawn as unknown as jest.Mock).mock.calls.at(-1);
    expect(call?.[0]).toBe('codex');
    expect(call?.[1]).toContain('exec');
    expect(call?.[1]).toContain('--model');
  });
});
