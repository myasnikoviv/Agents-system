import { RunContext } from './RunContext';
import { languageInstructionTag } from '../LanguageDetection';

export class SystemPromptGenerator {
  /**
   * Generates a comprehensive system prompt for an agent based on its RunContext.
   */
  static generate(context: RunContext): string {
    const { agent, pipeline } = context;

    const sections: string[] = [];

    // 1. Role Identification
    sections.push(`Active role: ${agent.title} (Slug: ${agent.slug})`);
    sections.push(`Mission: ${agent.mission}`);
    sections.push(`Instructions:\n${agent.instructions}`);

    // 2. Pipeline Context
    sections.push(`Current Pipeline: ${pipeline.title}`);
    sections.push(`Current Stage: ${pipeline.currentStageId} - ${pipeline.currentStageTitle}`);
    
    if (context.activeTicketId) {
      sections.push(`Active Ticket: ${context.activeTicketId}`);
    }

    // 3. Artifacts & Previous Outputs
    if (context.artifacts.priorOutputs && context.artifacts.priorOutputs.length > 0) {
      const artifactSummary = context.artifacts.priorOutputs.map(o => 
        `- [${o.stageId}] ${o.roleSlug}: ${o.summary}`
      ).join('\n');
      sections.push(`Previous Stage Outputs:\n${artifactSummary}`);
    }

    // 4. Shared Memory & Facts
    const facts = Object.entries(context.memory.sharedFacts);
    if (facts.length > 0) {
      sections.push(`Shared Facts:\n${facts.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')}`);
    }

    // 5. Tools
    if (context.tools && context.tools.length > 0) {
      sections.push(`Available Tools:\n${context.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`);
    }

    // 6. Output Contract
    sections.push(`Output Contract:\n- Response Mode: ${context.outputContract.responseMode}\n- Required Sections: ${context.outputContract.requiredSections.join(', ')}`);

    // 7. Language policy
    const responseLanguage = languageInstructionTag(context.task.responseLanguage || 'unknown');
    sections.push(
      `Language Policy:\n- Detect and follow the user's language in the latest message.\n- Respond in: ${responseLanguage}.\n- Switch language only if the user explicitly asks to switch.`
    );

    // 8. Instruction Footer
    sections.push(`
You are acting as the ${agent.title}. 
Focus on executing the current stage of the pipeline: "${pipeline.currentStageTitle}".
Adhere to the project guardrails and use available tools to fulfill the mission.
Be concise, proactive, and stay within your role's professional domain.
    `.trim());

    return sections.join('\n\n');
  }
}
