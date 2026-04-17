import { RunContext } from './context/RunContext';
import * as fs from 'fs';
import * as path from 'path';

export class ToolExecutor {
  static async execute(
    name: string,
    args: any,
    context: RunContext,
    meta?: { viaWorkbench?: boolean; isolatedWorkspacePath?: string },
  ): Promise<any> {
    const enforceGateway = String(process.env.WORKBENCH_ENFORCE_GATEWAY || 'true').toLowerCase() !== 'false';
    if (enforceGateway && !meta?.viaWorkbench) {
      throw new Error(`direct_tool_access_blocked:${name}`);
    }

    console.log(`[ToolExecutor] Routing tool: ${name}`);

    // Map common tools to real implementations.
    const resolvePath = (p: string) => {
      if (path.isAbsolute(p)) return p;
      return path.join(meta?.isolatedWorkspacePath || context.workspacePath, p);
    };

    switch (name) {
      case 'ls':
      case 'list_dir':
        const rawDirPath = args.path || '.';
        const dirPath = resolvePath(rawDirPath);
        try {
          if (!fs.existsSync(dirPath)) return `Error: Path ${rawDirPath} does not exist.`;
          if (fs.statSync(dirPath).isFile()) {
            return `${rawDirPath} is a file, not a directory. Suggest using read_file instead.`;
          }
          const files = fs.readdirSync(dirPath);
          return `List of files in ${rawDirPath}: [${files.join(', ')}]`;
        } catch (e: any) {
          return `Error listing directory ${rawDirPath}: ${e.message}`;
        }
      case 'read_file':
        const rawFilePath = args.path;
        const filePath = resolvePath(rawFilePath);
        try {
          if (!fs.existsSync(filePath)) return `Error: File ${rawFilePath} does not exist.`;
          const content = fs.readFileSync(filePath, 'utf-8');
          return content;
        } catch (e: any) {
          return `Error reading file ${rawFilePath}: ${e.message}`;
        }
      case 'search_web':
        return `Search results for "${args.query}": [result 1, result 2] (stub — requires external API)`;
      default:
        throw new Error(`Tool implementation for "${name}" not found.`);
    }
  }
}
