import * as fs from 'fs';
import * as path from 'path';

export type CockpitExecutorBackend = 'claude-cli' | 'codex-cli' | 'openhands-sdk';

export interface CockpitRuntimeCapabilities {
  requiresLocalAuth: boolean;
  supportsExecutorSelection: boolean;
  implicitCodexApiKey?: string;
  effectiveMode: 'cli' | 'direct';
  openhandsServerAlive?: boolean;
}

export interface CockpitExecutorConfig {
  backend: CockpitExecutorBackend;
  projectRoot: string;
  claude: {
    bin: string;
    model: string;
  };
  codex: {
    bin: string;
    model: string;
    sandbox: 'read-only' | 'workspace-write' | 'danger-full-access';
  };
  openhands: {
    serverUrl: string;
    model: string;
    apiKeys: {
      openai?: string;
      anthropic?: string;
      google?: string;
    };
  };
}

export function loadConfig(projectRoot: string): CockpitExecutorConfig {
  const absProjectRoot = path.resolve(projectRoot);
  const configPath = path.resolve(absProjectRoot, 'cockpit_config.json');
  
  const defaults: CockpitExecutorConfig = {
    backend: 'claude-cli',
    projectRoot: absProjectRoot,
    claude: {
      bin: process.env.CLAUDE_CLI_BIN || 'claude',
      model: process.env.CLAUDE_CODE_MODEL || 'auto',
    },
    codex: {
      bin: process.env.CODEX_CLI_BIN || 'codex',
      model: process.env.CODEX_MODEL || 'auto',
      sandbox: 'workspace-write',
    },
    openhands: {
      serverUrl: process.env.OPENHANDS_SERVER_URL || 'http://localhost:8000',
      model: process.env.OPENHANDS_MODEL || 'anthropic/claude-sonnet-4-6',
      apiKeys: {
        openai: process.env.OPENAI_API_KEY || '',
        anthropic: process.env.ANTHROPIC_API_KEY || '',
        google: process.env.GOOGLE_API_KEY || '',
      },
    },
  };

  if (fs.existsSync(configPath)) {
    try {
      const stored = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const openhandsConfigRaw = {
        ...defaults.openhands,
        ...(stored.openhands || {}),
        apiKeys: { ...defaults.openhands.apiKeys, ...(stored.openhands?.apiKeys || {}) },
      };
      const { workspacePath: _deprecatedWorkspacePath, ...openhandsConfig } = openhandsConfigRaw as typeof openhandsConfigRaw & { workspacePath?: string };
      return {
        ...defaults,
        ...stored,
        claude: { ...defaults.claude, ...(stored.claude || {}) },
        codex: { ...defaults.codex, ...(stored.codex || {}) },
        openhands: openhandsConfig,
      };
    } catch (e) {
      console.error(`Failed to load cockpit_config.json from ${configPath}:`, e);
    }
  }
  return defaults;
}

export function saveConfig(config: CockpitExecutorConfig) {
  const configPath = path.resolve(config.projectRoot, 'cockpit_config.json');
  try {
    const { projectRoot, ...rest } = config; // Don't save projectRoot to the file
    fs.writeFileSync(configPath, JSON.stringify(rest, null, 2));
  } catch (e) {
    console.error(`Failed to save cockpit_config.json to ${configPath}:`, e);
  }
}

export function getCockpitExecutorConfig(): CockpitExecutorConfig {
  return loadConfig(process.cwd());
}

export function updateCockpitExecutorConfig(config: Partial<CockpitExecutorConfig>): CockpitExecutorConfig {
  const current = getCockpitExecutorConfig();
  const updated = { ...current, ...config };
  saveConfig(updated);
  return updated;
}

export function resolveRuntimeCapabilities(config?: CockpitExecutorConfig): CockpitRuntimeCapabilities {
  let implicitCodexApiKey = undefined;
  if (process.env.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    implicitCodexApiKey = key.length > 10 ? `${key.slice(0, 8)}...${key.slice(-4)}` : '***';
  }

  return {
    requiresLocalAuth: true,
    supportsExecutorSelection: true,
    implicitCodexApiKey,
    effectiveMode: 'cli',
    openhandsServerAlive: false,
  };
}
