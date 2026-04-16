export interface DiscoveredContent {
    metadata: any;
    sections: Record<string, string>;
    raw: string;
}
export declare class MarkdownInterpreter {
    /**
     * Parses a markdown file with optional YAML frontmatter and sections defined by H2 headers.
     */
    static parse(filePath: string): DiscoveredContent;
}
