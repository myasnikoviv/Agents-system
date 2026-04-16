import * as yaml from 'js-yaml';
import { ManagedAsset } from './AssetDomainModel';

/**
 * AGSYS-3507 — Template Serializer
 * Converts ManagedAsset back to the canonical Markdown format.
 */

export class TemplateSerializer {
  
  static serialize(asset: ManagedAsset): string {
    const { identity, metadata, attributes, lineage } = asset;

    // 1. Prepare YAML Frontmatter
    const frontmatter = {
      name: metadata.name,
      slug: identity.slug,
      version: metadata.version,
      lineage: {
        source_template_id: lineage.source_template_id,
        customization_level: lineage.customization_level
      },
      ...attributes // Include other attributes as top-level fields
    };

    // Remove duplicates or internal fields if necessary
    delete (frontmatter as any).mission;
    delete (frontmatter as any).persona;
    delete (frontmatter as any).instructions;

    const yamlBlock = `---\n${yaml.dump(frontmatter)}---\n\n`;

    // 2. Build Markdown content
    let markdown = yamlBlock;
    markdown += `# ${metadata.name} (${identity.slug})\n\n`;

    // 3. Serialize Sections (Common for Agents)
    if (attributes.mission) {
      markdown += `## Mission\n\n${attributes.mission}\n\n`;
    }
    if (attributes.persona) {
      markdown += `## Persona\n\n${attributes.persona}\n\n`;
    }
    if (attributes.instructions) {
      markdown += `## Instructions\n\n${attributes.instructions}\n\n`;
    }

    // 4. Handle other potential attributes
    // This is extendable for Skill or Pipeline specific serialization
    
    return markdown;
  }
}
