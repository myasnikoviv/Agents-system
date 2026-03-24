import fs from 'fs/promises';
import path from 'path';
import { loadProjectRuntimeManifest } from './ProjectRuntimeManifestLoader';
import { ProjectRuntimeManifest } from './ProjectRuntimeManifest';
import { validateProjectRuntimeManifest } from './ProjectRuntimeManifestValidator';

export type MigrationResult = {
  projectRoot: string;
  outputPath: string;
  issues: ReturnType<typeof validateProjectRuntimeManifest>;
  manifest: ProjectRuntimeManifest;
};

export type MigrationOptions = {
  projectRoot?: string;
  outputPath?: string;
};

const DEFAULT_OUTPUT = path.join('docs', 'runtime', 'project-runtime-manifest.v1.json');

export async function generateCanonicalRuntimeManifestBundle(
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const outputPath = path.resolve(projectRoot, options.outputPath || DEFAULT_OUTPUT);

  const manifest = await loadProjectRuntimeManifest({
    projectRoot,
    preferCanonicalBundle: false,
  });

  manifest.metadata = {
    ...(manifest.metadata || {}),
    migration: 'markdown-to-canonical-bundle-v1',
    generatedAt: new Date().toISOString(),
    generatedFrom: 'docs/agents + docs/skills + docs/pipelines',
  };

  const issues = validateProjectRuntimeManifest(manifest);
  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    const summary = errors.map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`Manifest migration blocked by validation errors: ${summary}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  return { projectRoot, outputPath, issues, manifest };
}
