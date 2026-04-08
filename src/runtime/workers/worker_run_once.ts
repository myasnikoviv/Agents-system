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
