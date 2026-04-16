import { loadProjectRuntimeManifest } from '../ProjectRuntimeManifestLoader';
import { validateProjectRuntimeManifest } from '../ProjectRuntimeManifestValidator';

describe('ProjectRuntimeManifest', () => {
  it('loads manifest from current project and passes validation', async () => {
    const manifest = await loadProjectRuntimeManifest({ projectRoot: process.cwd() });

    expect(manifest.manifestVersion).toBe('1.0');
    expect(manifest.agents.length).toBeGreaterThan(0);
    expect(manifest.skills.length).toBeGreaterThan(0);
    expect(manifest.pipelines.length).toBeGreaterThan(0);
    expect(manifest.policies.gates.length).toBeGreaterThan(0);

    const issues = validateProjectRuntimeManifest(manifest);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('flags invalid default count', async () => {
    const manifest = await loadProjectRuntimeManifest({ projectRoot: process.cwd() });
    for (const p of manifest.pipelines) {
      p.default = false;
    }

    const issues = validateProjectRuntimeManifest(manifest);
    expect(issues.some((i) => i.code === 'invalid_default_count')).toBe(true);
  });
});
