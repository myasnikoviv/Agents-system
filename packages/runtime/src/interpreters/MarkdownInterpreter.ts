import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface DiscoveredContent {
  metadata: any;
  sections: Record<string, string>;
  raw: string;
}

export class MarkdownInterpreter {
  /**
   * Parses a markdown file with optional YAML frontmatter and sections defined by H2 headers.
   */
  static parse(filePath: string): DiscoveredContent {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const sections: Record<string, string> = {};
    let metadata: any = {};
    let content = raw;

    // Parse YAML Frontmatter
    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (frontmatterMatch && frontmatterMatch[1]) {
      try {
        metadata = yaml.load(frontmatterMatch[1]) as any;
        content = raw.slice(frontmatterMatch[0].length);
      } catch (e) {
        console.error(`Error parsing frontmatter in ${filePath}:`, e);
      }
    }

    // Parse Sections (H2 headers: ## Section Name)
    const h2Regex = /^##\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let currentTitle: string | null = null;

    while ((match = h2Regex.exec(content)) !== null) {
      if (currentTitle) {
        sections[currentTitle] = content.slice(lastIndex, match.index).trim();
      }
      currentTitle = (match[1] || '').trim();
      lastIndex = h2Regex.lastIndex;
    }

    if (currentTitle) {
      sections[currentTitle] = content.slice(lastIndex).trim();
    }

    return {
      metadata,
      sections,
      raw
    };
  }
}
