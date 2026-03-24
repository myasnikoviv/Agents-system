import * as fs from 'fs';
import * as path from 'path';

export type CockpitExecutorBackend = 'claude-cli' | 'codex-cli' | 'openhands-sdk';

const CONFIG_PATH = path.resolve(process.cwd(), 'cockpit_config.json');

export interface CockpitRuntimeCapabilities {
  requiresLocalAuth: boolean;
  supportsExecutorSelection: boolean;
  implicitCodexApiKey?: string;
  effectiveMode: 'cli' | 'direct';
  openhandsServerAlive?: boolean;
}

export interface CockpitExecutorConfig {
  backend: CockpitExecutorBackend;
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
    workspacePath: string;
  };
}

function loadConfig(): CockpitExecutorConfig {
  const defaults: CockpitExecutorConfig = {
    backend: 'claude-cli',
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
      workspacePath: process.env.OPENHANDS_WORKSPACE_PATH || process.cwd(),
    },
  };

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return {
        ...defaults,
        ...stored,
        claude: { ...defaults.claude, ...(stored.claude || {}) },
        codex: { ...defaults.codex, ...(stored.codex || {}) },
        openhands: { 
          ...defaults.openhands, 
          ...(stored.openhands || {}),
          apiKeys: { ...defaults.openhands.apiKeys, ...(stored.openhands?.apiKeys || {}) }
        },
      };
    } catch (e) {
      console.error('Failed to load cockpit_config.json:', e);
    }
  }
  return defaults;
}

let executorConfig: CockpitExecutorConfig = loadConfig();

function saveConfig(config: CockpitExecutorConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save cockpit_config.json:', e);
  }
}

export function getCockpitExecutorConfig(): CockpitExecutorConfig {
  return executorConfig;
}

export function updateCockpitExecutorConfig(patch: Partial<CockpitExecutorConfig>): CockpitExecutorConfig {
  executorConfig = {
    ...executorConfig,
    ...patch,
    claude: {
      ...executorConfig.claude,
      ...(patch.claude || {}),
    },
    codex: {
      ...executorConfig.codex,
      ...(patch.codex || {}),
    },
    openhands: {
      ...executorConfig.openhands,
      ...(patch.openhands || {}),
      apiKeys: {
        ...executorConfig.openhands.apiKeys,
        ...((patch.openhands || {}).apiKeys || {}),
      },
    },
  };
  saveConfig(executorConfig);
  return executorConfig;
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
    effectiveMode: 'cli', // Default to cli for this project's current state
    openhandsServerAlive: false, // Default to false, check would be async
  };
}
