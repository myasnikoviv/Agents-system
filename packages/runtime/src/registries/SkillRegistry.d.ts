export interface SkillProfile {
    id: string;
    name: string;
    description: string;
    tools: string[];
    usageGuidelines: string;
    sourcePath: string;
    assetId?: string;
    projectId?: string;
}
export declare class SkillRegistry {
    private static skills;
    static register(profile: SkillProfile): void;
    static getSkill(id: string): SkillProfile | undefined;
    static getAllSkills(): SkillProfile[];
    static clear(): void;
}
