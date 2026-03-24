import { describe, expect, it } from '@jest/globals';
import { SkillProvider } from '../SkillProvider';

describe('SkillProvider role rules', () => {
  it('always includes pipeline-selection for pm-orchestrator default selection', async () => {
    const result = await SkillProvider.loadSkillsForRole('pm-orchestrator', 'Need help with task');
    expect(result.selected.length).toBeGreaterThan(0);
    expect(result.selected.some((s) => s.id === 'pipeline-selection')).toBe(true);
  });

  it('provides explicit rules for every selected PM skill', async () => {
    const result = await SkillProvider.loadSkillsForRole(
      'pm-orchestrator',
      'Wrong branch recovery and pipeline routing issue',
    );
    expect(result.selected.length).toBeGreaterThan(0);
    for (const skill of result.selected) {
      expect(skill.rule.useWhen.length).toBeGreaterThan(0);
      expect(skill.rule.avoidWhen.length).toBeGreaterThan(0);
    }
  });
});
