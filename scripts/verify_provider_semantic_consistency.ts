import fs from 'fs';
import path from 'path';

interface ProviderSample {
  provider: string;
  prompt: string;
  response: string;
}

interface PairResult {
  providerA: string;
  providerB: string;
  score: number;
  pass: boolean;
}

interface FixtureCase {
  id: string;
  prompt: string;
  responses: Record<string, string>;
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

function normalizeText(input: string): string[] {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  const intersection = Array.from(A).filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : intersection / union;
}

function main() {
  const workspace = process.cwd();
  const ledgerDir = path.resolve(workspace, 'docs/process/runs/ledger');
  const outDir = path.resolve(workspace, 'docs/process/runs/provider-consistency-semantic');
  fs.mkdirSync(outDir, { recursive: true });

  const threshold = Number(process.env.PROVIDER_SEMANTIC_MIN_SCORE || '0.15');
  const files = fs.existsSync(ledgerDir)
    ? fs
        .readdirSync(ledgerDir)
        .filter((f) => f.endsWith('.jsonl'))
        .sort()
    : [];
  const samplesByPrompt = new Map<string, ProviderSample[]>();

  for (const file of files.slice(-200)) {
    const rows = readJsonl(path.join(ledgerDir, file));
    for (const row of rows) {
      if (String(row?.type || '') !== 'llm.response') continue;
      const payload = row?.payload || {};
      const provider = String(payload?.provider || row?.actor?.id || 'unknown');
      const prompt = String(payload?.prompt || '');
      const response = String(payload?.response || '');
      if (!prompt || !response) continue;
      const existing = samplesByPrompt.get(prompt) || [];
      existing.push({ provider, prompt, response });
      samplesByPrompt.set(prompt, existing);
    }
  }

  const pairResults: PairResult[] = [];
  for (const [, samples] of samplesByPrompt) {
    const uniqueByProvider = new Map<string, ProviderSample>();
    for (const sample of samples) {
      if (!uniqueByProvider.has(sample.provider)) uniqueByProvider.set(sample.provider, sample);
    }
    const unique = Array.from(uniqueByProvider.values());
    if (unique.length < 2) continue;
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const a = unique[i];
        const b = unique[j];
        const score = jaccard(normalizeText(a.response), normalizeText(b.response));
        pairResults.push({
          providerA: a.provider,
          providerB: b.provider,
          score,
          pass: score >= threshold,
        });
      }
    }
  }

  let source: 'ledger' | 'fixtures' = 'ledger';
  if (pairResults.length === 0) {
    const fixturePath = path.resolve(workspace, 'docs/runtime/adaptive/provider-semantic-fixtures.json');
    if (fs.existsSync(fixturePath)) {
      try {
        const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as { cases?: FixtureCase[] };
        for (const c of fixture.cases || []) {
          const providers = Object.keys(c.responses || {});
          for (let i = 0; i < providers.length; i += 1) {
            for (let j = i + 1; j < providers.length; j += 1) {
              const a = providers[i];
              const b = providers[j];
              const score = jaccard(normalizeText(c.responses[a]), normalizeText(c.responses[b]));
              pairResults.push({ providerA: a, providerB: b, score, pass: score >= threshold });
            }
          }
        }
        if (pairResults.length > 0) source = 'fixtures';
      } catch {
        // ignore fixture parse errors
      }
    }
  }

  const comparablePairs = pairResults.length;
  const pass = comparablePairs > 0 && pairResults.every((p) => p.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    source,
    threshold,
    comparablePairs,
    pass,
    pairs: pairResults,
  };
  const filePath = path.join(outDir, `report-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Semantic provider consistency report: ${filePath}`);
  console.log(`PAIRS=${comparablePairs}`);
  console.log(`PASS=${pass}`);
}

main();
