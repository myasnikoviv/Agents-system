export type SkillId = 'repo-navigation' | 'refactor' | 'test-generation' | 'test-fixing' | 'architecture-review' | 'documentation-update' | 'pipeline-selection' | 'research-before-implementation' | 'retrospective' | 'knowledge-update' | 'skill-gap-detection' | 'runtime-inspection' | 'market-structure-research' | 'wave-logic-formalization' | 'domain-ambiguity-detection' | 'strategy-validation' | 'backtest-result-analysis';
export interface RoleSkillRule {
    skillId: SkillId;
    useWhen: string;
    avoidWhen: string;
    keywords: string[];
}
export declare const ROLE_SKILL_RULES: Record<string, RoleSkillRule[]>;
export declare const SKILL_FILE_BY_ID: Record<SkillId, string>;
