import fs from 'fs/promises';
import path from 'path';
import { ROLE_SKILL_RULES, SKILL_FILE_BY_ID, RoleSkillRule, SkillId } from './SkillCatalog';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  whenToUse: string;
  whenNotToUse: string;
  workflow: string[];
  sourcePath: string;
}

export interface RoleSkillSelection {
  selected: Array<SkillDefinition & { rule: RoleSkillRule }>;
  allRules: RoleSkillRule[];
}

export class SkillProvider {
  private static LEGACY_SKILLS_DIR = path.resolve(process.cwd(), 'docs/skills');

  static async loadSkillsForRole(roleSlug: string, userMessage: string): Promise<RoleSkillSelection> {
    const rules = ROLE_SKILL_RULES[roleSlug] || [];
    if (rules.length === 0) {
      return { selected: [], allRules: [] };
    }

    const loaded = await Promise.all(
      rules.map(async (rule) => {
        const skill = await this.loadSkillById(rule.skillId);
        return skill ? { ...skill, rule } : null;
      }),
    );

    const available = loaded.filter((v): v is SkillDefinition & { rule: RoleSkillRule } => v !== null);
    if (available.length === 0) {
      return { selected: [], allRules: rules };
    }

    const selected = this.selectSkillsForMessage(available, userMessage);
    const mandatoryPipelineSkill = available.find((s) => s.id === 'pipeline-selection');
    if (roleSlug === 'pm-orchestrator' && mandatoryPipelineSkill) {
      const withoutMandatory = selected.filter((s) => s.id !== 'pipeline-selection');
      const withMandatory = [mandatoryPipelineSkill, ...withoutMandatory].slice(0, 3);
      return { selected: withMandatory, allRules: rules };
    }

    return { selected, allRules: rules };
  }

  static async loadSkill(roleSlug: string, userMessage = ''): Promise<SkillDefinition | null> {
    const selection = await this.loadSkillsForRole(roleSlug, userMessage);
    if (selection.selected.length > 0) {
      return selection.selected[0] ?? null;
    }
    return this.loadLegacyRoleSkill(roleSlug);
  }

  private static selectSkillsForMessage(
    skills: Array<SkillDefinition & { rule: RoleSkillRule }>,
    userMessage: string,
  ): Array<SkillDefinition & { rule: RoleSkillRule }> {
    const lowered = userMessage.toLowerCase();
    const scored = skills.map((skill) => {
      const score = skill.rule.keywords.reduce((acc, keyword) => {
        return acc + (lowered.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);
      return { skill, score };
    });

    const maxScore = Math.max(...scored.map((x) => x.score));
    if (maxScore <= 0) {
      return skills.slice(0, Math.min(3, skills.length));
    }

    return scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.skill);
  }

  private static async loadSkillById(skillId: SkillId): Promise<SkillDefinition | null> {
    const relPath = SKILL_FILE_BY_ID[skillId];
    const fullPath = path.resolve(process.cwd(), relPath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        id: skillId,
        name: this.extractSection(content, 'name') || skillId,
        description: this.extractSection(content, 'description'),
        whenToUse: this.extractSection(content, 'when_to_use'),
        whenNotToUse: this.extractSection(content, 'when_not_to_use'),
        workflow: this.extractWorkflow(content),
        sourcePath: relPath,
      };
    } catch {
      return null;
    }
  }

  private static async loadLegacyRoleSkill(roleSlug: string): Promise<SkillDefinition | null> {
    const filePath = path.join(this.LEGACY_SKILLS_DIR, `${roleSlug}-skill.md`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        id: 'repo-navigation',
        name: this.extractLegacySection(content, 'Skill Name') || roleSlug,
        description: this.extractLegacySection(content, 'Purpose'),
        whenToUse: '',
        whenNotToUse: '',
        workflow: this.extractLegacyListSection(content, 'Workflow'),
        sourcePath: path.relative(process.cwd(), filePath),
      };
    } catch {
      return null;
    }
  }

  private static extractSection(content: string, sectionTitle: string): string {
    const regex = new RegExp(`(?:^|\\n)# ${sectionTitle}\\n([\\s\\S]*?)(?=\\n# |$)`);
    const match = content.match(regex);
    if (!match || !match[1]) return '';
    return match[1].trim();
  }

  private static extractWorkflow(content: string): string[] {
    const workflow = this.extractSection(content, 'workflow');
    if (!workflow) return [];
    return workflow
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s+/, '').replace(/^-\s+/, '').trim())
      .filter((line) => line.length > 0);
  }

  private static extractLegacySection(content: string, sectionTitle: string): string {
    const regex = new RegExp(`## ${sectionTitle}\\n+([^#]+)`, 'i');
    const match = content.match(regex);
    if (!match || !match[1]) return '';
    return match[1].trim();
  }

  private static extractLegacyListSection(content: string, sectionTitle: string): string[] {
    const section = this.extractLegacySection(content, sectionTitle);
    if (!section) return [];
    return section
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s+/, '').replace(/^-\s+/, '').trim())
      .filter((line) => line.length > 0);
  }
}
