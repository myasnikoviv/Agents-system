import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('SkillTelemetryRegistry', () => {
  it('persists usage and builds summary with unused skills', async () => {
    const prevCwd = process.cwd();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-telemetry-'));
    process.chdir(tempDir);
    jest.resetModules();

    const mod = await import('../SkillTelemetryRegistry');
    await mod.appendSkillUsage({
      timestamp: new Date().toISOString(),
      runId: 'r1',
      ticketId: 'AGSYS-27',
      threadId: 't1',
      roleSlug: 'pm-orchestrator',
      pipelineId: 'new-feature',
      stage: 'intake',
      skillId: 'pipeline-selection',
      sourcePath: 'skills/runtime/pipeline-selection/SKILL.md',
      durationMs: 42,
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      outcome: 'success',
    });

    const rows = await mod.readSkillUsage();
    expect(rows.length).toBe(1);
    expect(rows[0].ticketId).toBe('AGSYS-27');

    const summary = await mod.getSkillTelemetrySummary();
    expect(summary.totalEvents).toBe(1);
    expect(summary.bySkill['pipeline-selection']).toBe(1);
    expect(summary.byRole['pm-orchestrator']).toBe(1);
    expect(summary.byPipeline['new-feature']).toBe(1);
    expect(summary.unusedSkills).toContain('architecture-review');

    process.chdir(prevCwd);
  });
});

