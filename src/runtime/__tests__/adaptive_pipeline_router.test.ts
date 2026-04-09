import { PipelineRegistry } from '../registries/PipelineRegistry';
import { resolveAdaptivePipelineRoute } from '../planner/AdaptivePipelineRouter';

describe('AdaptivePipelineRouter', () => {
  beforeEach(() => {
    PipelineRegistry.clear();
  });

  it('keeps primary pipeline when it exists in registry', async () => {
    PipelineRegistry.register({
      id: 'bug-fix',
      slug: 'bug-fix',
      name: 'Bug Fix',
      title: 'Bug Fix',
      description: 'test',
      sourcePath: 'test',
      stages: [],
    });
    const route = await resolveAdaptivePipelineRoute({
      selectedPipeline: 'bug-fix',
      plannerPipeline: 'new-feature',
      message: 'fix bug',
      workspacePath: process.cwd(),
    });
    expect(route.pipeline).toBe('bug-fix');
    expect(route.reason).toBe('primary_pipeline_available');
  });

  it('falls back adaptively when primary pipeline is unavailable', async () => {
    const route = await resolveAdaptivePipelineRoute({
      selectedPipeline: 'non-existent-pipeline',
      plannerPipeline: 'non-existent-pipeline',
      message: 'we need to fix a bug in runtime',
      workspacePath: process.cwd(),
    });
    expect(route.pipeline).toBeTruthy();
    expect(route.reason.startsWith('adaptive_fallback:')).toBe(true);
  });
});
