import { AgentValidator } from '../validators/AgentValidator';

export interface AgentProfile {
  slug: string;
  name: string;
  title: string;
  callsign: string;
  mission: string;
  description: string;
  instructions: string;
  owns: string[];
  guardrails: string[];
  skills: string[];
  tools: string[];
  fullInstructions: string;
  sourcePath: string;
}

export class AgentRegistry {
  private static agents: Map<string, AgentProfile> = new Map();

  static register(profile: AgentProfile) {
    // Sprint 3: Model Hardening - Validate profile before registration
    AgentValidator.validateAgent(profile as any);
    this.agents.set(profile.slug, profile);
  }

  static getAgent(slug: string): AgentProfile | undefined {
    return this.agents.get(slug);
  }

  static getAllAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  static clear() {
    this.agents.clear();
  }
}
