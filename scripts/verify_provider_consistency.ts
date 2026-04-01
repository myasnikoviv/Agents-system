import fs from 'fs';
import path from 'path';

interface ProviderSample {
  provider: string;
  count: number;
  missingUsageFields: number;
  negativeDurationCount: number;
}

function readJsonl(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  const workspacePath = process.cwd();
  const ledgerDir = path.resolve(workspacePath, 'docs/process/runs/ledger');
  const outDir = path.resolve(workspacePath, 'docs/process/runs/provider-consistency');
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.existsSync(ledgerDir) ? fs.readdirSync(ledgerDir).filter((f) => f.endsWith('.jsonl')) : [];
  const samples = new Map<string, ProviderSample>();

  for (const file of files.slice(-30)) {
    const rows = readJsonl(path.join(ledgerDir, file));
    for (const row of rows) {
      if (String(row?.type || '') !== 'llm.response') continue;
      const payload = row?.payload || {};
      const provider = String(payload?.provider || row?.actor?.id || 'unknown');
      const durationMs = Number(payload?.durationMs || 0);
      const hasUsage = Number.isFinite(Number(payload?.tokensInput)) && Number.isFinite(Number(payload?.tokensOutput));

      const s = samples.get(provider) || {
        provider,
        count: 0,
        missingUsageFields: 0,
        negativeDurationCount: 0,
      };
      s.count += 1;
      if (!hasUsage) s.missingUsageFields += 1;
      if (durationMs < 0) s.negativeDurationCount += 1;
      samples.set(provider, s);
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    providers: Array.from(samples.values()),
    pass: Array.from(samples.values()).every((s) => s.missingUsageFields === 0 && s.negativeDurationCount === 0),
  };
  const filePath = path.join(outDir, `report-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Provider consistency report: ${filePath}`);
  console.log(`PASS=${result.pass}`);
}

main();
