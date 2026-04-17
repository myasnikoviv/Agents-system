import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { loadProjectRuntimeManifest } from '../ProjectRuntimeManifestLoader';
import { generateCanonicalRuntimeManifestBundle } from '../ProjectRuntimeManifestMigration';

describe('ProjectRuntimeManifestMigration', () => {
  it('generates canonical bundle and loader consumes it', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-manifest-migration-'));
    const projectRoot = path.join(tmpRoot, 'sample-project');

    await fs.mkdir(path.join(projectRoot, 'docs', 'agents'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, 'docs', 'skills'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, 'docs', 'pipelines'), { recursive: true });

    await fs.writeFile(
      path.join(projectRoot, 'docs', 'agents', 'pm-orchestrator.md'),
      ['# PM Orchestrator', '', '## Guardrails', '- Always select a pipeline first.', '', '## MCP Servers', '- `plane`'].join('\n'),
      'utf-8',
    );

    await fs.writeFile(
      path.join(projectRoot, 'docs', 'skills', 'pm-orchestrator-skill.md'),
      ['# PM Skill', '', '## When To Use', '- Intake requests.', '', '## Constraints', '- Keep audit trail.'].join('\n'),
      'utf-8',
    );

    await fs.writeFile(
      path.join(projectRoot, 'docs', 'pipelines', 'unified-task-intake.md'),
      ['# Unified Task Intake', '', '## Steps', '1. PM intake and classify request.', '2. PM select pipeline.'].join('\n'),
      'utf-8',
    );

    const migration = await generateCanonicalRuntimeManifestBundle({ projectRoot });
    const bundleRaw = await fs.readFile(migration.outputPath, 'utf-8');
    const bundle = JSON.parse(bundleRaw) as { metadata?: Record<string, string> };

    expect(bundle.metadata?.migration).toBe('markdown-to-canonical-bundle-v1');

    await fs.writeFile(
      migration.outputPath,
      JSON.stringify(
        {
          ...(JSON.parse(bundleRaw) as object),
          metadata: { source: 'canonical-test-bundle' },
        },
        null,
        2,
      ) + '\n',
      'utf-8',
    );

    const loaded = await loadProjectRuntimeManifest({ projectRoot, preferCanonicalBundle: true });
    expect(loaded.metadata?.source).toBe('canonical-test-bundle');
  });
});
