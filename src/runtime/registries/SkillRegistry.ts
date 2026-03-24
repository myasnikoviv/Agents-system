export interface SkillProfile {
  id: string;
  name: string;
  description: string;
  tools: string[];
  usageGuidelines: string; // "When To Use"
  sourcePath: string;
}

export class SkillRegistry {
  private static skills: Map<string, SkillProfile> = new Map();

  static register(profile: SkillProfile) {
    this.skills.set(profile.id, profile);
  }

  static getSkill(id: string): SkillProfile | undefined {
    return this.skills.get(id);
  }

  static getAllSkills(): SkillProfile[] {
    return Array.from(this.skills.values());
  }

  static clear() {
    this.skills.clear();
  }
}
