import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export async function executeRunContextInSubprocess(input: {
  runContext: any;
  timeoutMs: number;
}): Promise<{ content: string }> {
  const cwd = process.cwd();
  const preflight = path.resolve(cwd, 'node_modules/tsx/dist/preflight.cjs');
  const loader = path.resolve(cwd, 'node_modules/tsx/dist/loader.mjs');
  const workerScript = path.resolve(cwd, 'src/runtime/workers/worker_run_once.ts');

  const tmpBase = path.join(os.tmpdir(), `agsys-worker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const inputPath = `${tmpBase}.in.json`;
  const outputPath = `${tmpBase}.out.json`;

  fs.writeFileSync(inputPath, JSON.stringify({ runContext: input.runContext }), 'utf8');

  const args = ['--require', preflight, '--import', `file://${loader}`, workerScript, inputPath, outputPath];

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: 'ignore',
      env: process.env,
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`worker_subprocess_timeout:${input.timeoutMs}`));
    }, Math.max(1000, Number(input.timeoutMs || 60000)));

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(Number(code ?? 1));
    });
  });

  try {
    const raw = fs.readFileSync(outputPath, 'utf8');
    const payload = JSON.parse(raw || '{}');
    if (!payload?.ok) {
      throw new Error(String(payload?.error || `worker_subprocess_failed:${exitCode}`));
    }
    return { content: String(payload.content || '') };
  } finally {
    try {
      fs.unlinkSync(inputPath);
    } catch {}
    try {
      fs.unlinkSync(outputPath);
    } catch {}
  }
}
