import fs from 'fs';
import path from 'path';
import { AgentExecutor } from '../AgentExecutor';

async function main() {
  const inputPath = String(process.argv[2] || '').trim();
  const outputPath = String(process.argv[3] || '').trim();
  if (!inputPath || !outputPath) {
    process.exitCode = 2;
    return;
  }

  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const payload = JSON.parse(raw || '{}');
  const runContext = payload?.runContext;

  // Probe mode for worker-process model tests:
  // verifies process identity and confirms no shared in-process memory across runs.
  if (runContext?.__processProbe) {
    const beforeSharedMarker = Boolean((globalThis as any).__AGSYS_WORKER_SHARED_MARKER);
    if (runContext?.__processProbe?.setSharedMarker) {
      (globalThis as any).__AGSYS_WORKER_SHARED_MARKER = true;
    }
    const afterSharedMarker = Boolean((globalThis as any).__AGSYS_WORKER_SHARED_MARKER);
    fs.writeFileSync(
      path.resolve(outputPath),
      JSON.stringify({
        ok: true,
        content: JSON.stringify({
          pid: process.pid,
          agentSlug: String(runContext?.agent?.slug || ''),
          workerId: String(runContext?.memory?.workerId || ''),
          beforeSharedMarker,
          afterSharedMarker,
        }),
      }),
      'utf8',
    );
    return;
  }

  try {
    const executor = new AgentExecutor();
    const result = await executor.run(runContext);
    fs.writeFileSync(path.resolve(outputPath), JSON.stringify({ ok: true, content: String(result?.content || '') }), 'utf8');
  } catch (error: any) {
    fs.writeFileSync(
      path.resolve(outputPath),
      JSON.stringify({ ok: false, error: String(error?.message || error || 'worker_run_failed') }),
      'utf8',
    );
    process.exitCode = 1;
  }
}

void main();
