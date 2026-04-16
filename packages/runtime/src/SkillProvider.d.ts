import { RoleSkillRule, SkillId } from './SkillCatalog';
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
    selected: Array<SkillDefinition & {
        rule: RoleSkillRule;
    }>;
    allRules: RoleSkillRule[];
}
export declare class SkillProvider {
    private static LEGACY_SKILLS_DIR;
    static loadSkillsForRole(roleSlug: string, userMessage: string): Promise<RoleSkillSelection>;
    static loadSkill(roleSlug: string, userMessage?: string): Promise<SkillDefinition | null>;
    private static selectSkillsForMessage;
    private static loadSkillById;
    private static loadLegacyRoleSkill;
    private static extractSection;
    private static extractWorkflow;
    private static extractLegacySection;
    private static extractLegacyListSection;
}
