import * as fs from 'fs';
import * as path from 'path';
import { MarkdownInterpreter } from './interpreters/MarkdownInterpreter';
import { AgentRegistry, AgentProfile } from './registries/AgentRegistry';
import { PipelineRegistry, PipelineDefinition, PipelineStage } from './registries/PipelineRegistry';
import { SkillRegistry, SkillProfile } from './registries/SkillRegistry';

export { AgentProfile, PipelineDefinition, PipelineStage, SkillProfile };
export { AgentRegistry, PipelineRegistry, SkillRegistry };

export class DynamicDiscoveryService {
  private static defaultDocsPath = path.join(process.cwd(), 'docs');

  static async discoverAll(projectRoot?: string) {
    const docsPath = projectRoot ? path.join(projectRoot, 'docs') : this.defaultDocsPath;
    await this.discoverAgents(docsPath);
    await this.discoverPipelines(docsPath);
    await this.discoverSkills(docsPath);
  }

  static async discoverAgents(docsPath: string = this.defaultDocsPath) {
    AgentRegistry.clear();
    const agentsDir = path.join(docsPath, 'agents');
    if (!fs.existsSync(agentsDir)) return;

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(agentsDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const slug = path.basename(file, '.md');
      
      // Extract from sections
      const name = (parsed.raw.split('\n')[0] || '').replace('#', '').trim();
      const callsign = (parsed.sections['Callsign'] || '').trim() || name;
      const mission = (parsed.sections['Mission'] || parsed.sections['Purpose'] || '').trim();
      const owns = this.extractList(parsed.sections['Owns']);
      const guardrails = this.extractList(parsed.sections['Guardrails']);
      const skills = this.extractList(parsed.sections['Skills'] || parsed.sections['Related Skills']);
      const tools = this.extractList(parsed.sections['Tools']);

      const profile: AgentProfile = {
        slug,
        name,
        title: name,
        callsign,
        mission,
        description: mission,
        instructions: parsed.raw,
        owns,
        guardrails,
        skills,
        tools,
        fullInstructions: parsed.raw,
        sourcePath: filePath
      };

      AgentRegistry.register(profile);
    }
  }

  static async discoverPipelines(docsPath: string = this.defaultDocsPath) {
    PipelineRegistry.clear();
    const pipelinesDir = path.join(docsPath, 'pipelines');
    if (!fs.existsSync(pipelinesDir)) return;

    const files = fs.readdirSync(pipelinesDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(pipelinesDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(file, '.md');

      const name = (parsed.raw.split('\n')[0] || '').replace('# Pipeline:', '').trim();
      const stages = this.parsePipelineStages(parsed.sections['Steps'] || '');

      const profile: PipelineDefinition = {
        id,
        slug: id,
        name,
        title: name,
        description: parsed.sections['Goal'] || '',
        stages,
        sourcePath: filePath
      };

      PipelineRegistry.register(profile);
    }
  }

  static async discoverSkills(docsPath: string = this.defaultDocsPath) {
    SkillRegistry.clear();
    const skillsDir = path.join(docsPath, 'skills');
    if (!fs.existsSync(skillsDir)) return;

    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(skillsDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(file, '.md');

      const name = parsed.sections['Skill Name'] || id;
      const tools = this.extractList(parsed.sections['Tools'] || parsed.sections['Outputs']); // Fallback

      const profile: SkillProfile = {
        id,
        name,
        description: parsed.sections['Purpose'] || '',
        tools,
        usageGuidelines: parsed.sections['When To Use'] || '',
        sourcePath: filePath
      };

      SkillRegistry.register(profile);
    }
  }

  private static extractList(section: string | undefined): string[] {
    if (!section) return [];
    return section.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .map(line => line.replace(/`/g, '')); // Remove backticks from skill names
  }

  private static parsePipelineStages(stepsSection: string): PipelineStage[] {
    const stages: PipelineStage[] = [];
    const lines = stepsSection.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      // Matches "1. Role: ..." or "1.1 Role: ..." or "1.1. Role: ..."
      const match = line.match(/^(\d+(\.\d+)*)\.?\s+([^:]+):\s*(.*)/);
      if (match && match[1] && match[3] && match[4]) {
        const roleName = match[3].trim();
        const description = match[4].trim();
        stages.push({
          id: match[1],
          name: `${roleName} Stage`,
          title: `${roleName} Stage`,
          role: roleName,
          agent: this.normalizeRoleToSlug(roleName),
          description: description,
          instructions: description, // Default instructions to description for now
          nextAllowedRoles: [], // Will be handled by PipelineRegistry.getNextStage
          completionCriteria: ''
        });
      }
    }
    return stages;
  }

  private static normalizeRoleToSlug(role: string): string {
    // Basic normalization: "PM Orchestrator" -> "pm-orchestrator"
    return role.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }
}
