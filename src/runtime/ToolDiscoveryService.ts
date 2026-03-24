import { RunContext } from './context/RunContext';
import { SkillRegistry } from './registries/SkillRegistry';
import { AgentProfile } from './registries/AgentRegistry';

export interface ToolDefinition {
  name: string;
  description: string;
  schema?: any;
}

export interface DiscoveryOptions {
  agent: AgentProfile;
  pipeline: {
    id: string;
    currentStageId: string;
  };
  guardrails: {
    blockedActions: string[];
  };
}

export class ToolDiscoveryService {
  /**
   * Resolves the set of tools available for the given run context.
   */
  static async resolveTools(options: DiscoveryOptions): Promise<ToolDefinition[]> {
    const tools: Map<string, ToolDefinition> = new Map();

    // 1. Add Global Mandatory Tools
    this.addGlobalTools(tools);

    // 2. Add Tools from Agent's assigned skills
    if (options.agent.skills) {
      for (const skillId of options.agent.skills) {
        const skill = SkillRegistry.getSkill(skillId);
        if (skill && skill.tools) {
          for (const toolName of skill.tools) {
            tools.set(toolName, {
              name: toolName,
              description: `Tool inherited from skill: ${skill.name}`
            });
          }
        }
      }
    }

    // 3. Add explicit tools defined in Agent profile
    if (options.agent.tools) {
      for (const toolName of options.agent.tools) {
        tools.set(toolName, {
          name: toolName,
          description: `Directly assigned tool from role profile.`
        });
      }
    }

    // 4. Apply Policy Filters
    return this.applyPolicy(Array.from(tools.values()), options);
  }

  private static addGlobalTools(tools: Map<string, ToolDefinition>) {
    const globalTools = ['ls', 'cat', 'grep', 'find', 'read_file', 'list_dir', 'search_web'];
    for (const name of globalTools) {
      tools.set(name, {
        name,
        description: `Global read-only discovery tool.`
      });
    }
  }

  private static applyPolicy(tools: ToolDefinition[], options: DiscoveryOptions): ToolDefinition[] {
    const isIntake = options.pipeline.currentStageId === 'intake';
    const dangerousTools = ['rm', 'git_push', 'deploy', 'delete_file'];

    if (isIntake) {
      return tools.filter(t => !dangerousTools.includes(t.name));
    }

    if (options.guardrails.blockedActions && options.guardrails.blockedActions.length > 0) {
      return tools.filter(t => {
        const isBlocked = options.guardrails.blockedActions.some(g => g.toLowerCase().includes(t.name.toLowerCase()));
        return !isBlocked;
      });
    }

    return tools;
  }
}
