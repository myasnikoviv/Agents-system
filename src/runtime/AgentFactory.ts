import fs from 'fs/promises';
import path from 'path';

export interface AgentDefinition {
    callsign: string;
    mission: string;
    owns: string[];
    guardrails: string[];
    fullInstructions: string;
}

export class AgentFactory {
    private static AGENTS_DIR = path.resolve(process.cwd(), 'docs/agents');

    /**
     * Parse an agent definition from its markdown file.
     */
    static async loadAgent(roleSlug: string): Promise<AgentDefinition> {
        const filePath = path.join(this.AGENTS_DIR, `${roleSlug}.md`);
        const content = await fs.readFile(filePath, 'utf-8');

        return {
            callsign: this.extractSection(content, 'Callsign') || roleSlug,
            mission: this.extractSection(content, 'Mission'),
            owns: this.extractListSection(content, 'Owns'),
            guardrails: this.extractListSection(content, 'Guardrails'),
            fullInstructions: content,
        };
    }

    private static extractSection(content: string, sectionTitle: string): string {
        const regex = new RegExp(`## ${sectionTitle}\\n+([^#]+)`, 'i');
        const match = content.match(regex);
        if (!match || !match[1]) return '';
        return match[1].trim();
    }

    private static extractListSection(content: string, sectionTitle: string): string[] {
        const section = this.extractSection(content, sectionTitle);
        if (!section) return [];
        return section
            .split('\n')
            .map(line => line.replace(/^-\s+/, '').trim())
            .filter(line => line.length > 0);
    }
}
