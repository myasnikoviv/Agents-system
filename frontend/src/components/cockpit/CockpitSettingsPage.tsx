import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Server, SlidersHorizontal, ShieldCheck, Eye, EyeOff, Clipboard, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { apiUrl, fetchJsonStrict } from '../../lib/http';
import { Button } from '../ui/Button';

const SECTIONS = [
  'general',
  'appearance',
  'configuration',
  'governance',
  'personalization',
  'usage',
  'mcp-servers',
  'git',
  'environment',
  'worktrees',
  'archived-threads',
] as const;

type SectionId = (typeof SECTIONS)[number];

interface MCPHealthRow {
  name: string;
  mode: 'isolated' | 'share-safe' | 'exclusive';
  status: 'ok' | 'warn' | 'unknown';
  note: string;
}

interface MCPServerEntry {
  id: string;
  name: string;
  transport: 'stdio' | 'http' | 'sse';
  mode: 'isolated' | 'share-safe' | 'exclusive';
  enabled: boolean;
  busyBy?: string;
}

interface GeneralSettings {
  defaultOpenBehavior: 'finder' | 'editor' | 'terminal';
  language: 'auto' | 'uk' | 'en';
  commandDetail: 'steps' | 'verbose' | 'minimal';
  executionSpeed: 'standard' | 'fast' | 'deep';
  runtimeMode: 'mock' | 'linear' | 'multiple_agents';
}

interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  accent: 'blue' | 'emerald' | 'violet';
  fontScale: 'small' | 'medium' | 'large';
}

interface PersonalizationSettings {
  assistantName: string;
  autoApproveSafeSteps: boolean;
  showHints: boolean;
  confirmLongActions: boolean;
}

interface UsageSettings {
  detailLevel: 'minimal' | 'steps' | 'verbose';
  notifyOnCompletion: boolean;
  showTokenStats: boolean;
}
interface SkillAnalyticsSummary {
  totalEvents: number;
  bySkill: Record<string, number>;
  byRole: Record<string, number>;
  byPipeline: Record<string, number>;
  unusedSkills: string[];
}

interface GitSettings {
  enforcePreflight: boolean;
  requireWorktreeIsolation: boolean;
  autoRunCleanupSweep: boolean;
}

interface EnvironmentSettings {
  executionMode: 'sandbox' | 'full-access';
  allowNetwork: boolean;
  defaultShell: 'bash' | 'zsh';
}

const ApiKeyInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = React.useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const getTeaser = (val: string) => {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return `${val.slice(0, 4)}••••••••${val.slice(-4)}`;
  };

  return (
    <label className="flex flex-col gap-1">
      {label}
      <div className="relative flex items-center">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 pr-20 text-sm text-slate-100"
        />
        {/* Custom teaser overlay when obscured and not empty */}
        {!show && value && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-slate-800 py-0.5 font-mono text-slate-400">
            {getTeaser(value)}
          </div>
        )}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="inline-flex items-center rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            title={show ? 'Hide' : 'Show'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            title="Paste"
          >
            <Clipboard size={16} />
          </button>
        </div>
      </div>
    </label>
  );
};

interface WorktreeSettings {
  defaultBasePath: string;
  autoPruneOnDone: boolean;
  strictOneTicketPerWorktree: boolean;
}

interface ArchivedThreadsSettings {
  retentionDays: '30' | '90' | '180' | '365';
  includeArtifacts: boolean;
}
interface ExecutorSettings {
  backend: 'claude-cli' | 'codex-cli' | 'openhands-sdk';
  claude: { bin: string; model: string };
  codex: { bin: string; model: string; sandbox: 'read-only' | 'workspace-write' | 'danger-full-access' };
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
interface GovernanceRuleRow {
  id: string;
  triggerPhases: string[];
  evidence: string[];
  evaluationType: 'deterministic' | 'hybrid' | 'llm';
  deterministicCheck?: string;
  enforcementMode: 'hard' | 'soft' | 'advisory';
  enabledByDefault: boolean;
  disabled?: boolean;
  effectiveEnabled?: boolean;
  thresholds?: Record<string, number>;
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
    owner?: string;
    tags?: string[];
    updatedAt?: string;
  };
}
interface ProjectPolicyState {
  projectId: string;
  enabledRules: string[];
  disabledRules: string[];
  ruleOverrides: Record<string, { evidence?: string[]; thresholds?: Record<string, number> }>;
}
interface EvaluatorRow {
  evaluatorType: string;
  isBuiltin: boolean;
}


interface CliStatus {
  codex?: { loggedIn: boolean };
  claude?: { loggedIn: boolean; needsLogin?: boolean };
}

interface CliStatusResponse {
  success: boolean;
  status: CliStatus;
  error?: string;
}

interface CliTestResponse {
  success: boolean;
  error?: string;
  result?: {
    stdout?: string;
    stderr?: string;
  };
}

interface CliLoginResponse {
  success: boolean;
  error?: string;
  message?: string;
  result?: {
    stderr?: string;
  };
}

const SETTINGS_KEYS = {
  general: 'cockpit.settings.general.v1',
  appearance: 'cockpit.settings.appearance.v1',
  personalization: 'cockpit.settings.personalization.v1',
  usage: 'cockpit.settings.usage.v1',
  git: 'cockpit.settings.git.v1',
  environment: 'cockpit.settings.environment.v1',
  worktrees: 'cockpit.settings.worktrees.v1',
  archivedThreads: 'cockpit.settings.archived-threads.v1',
  executor: 'cockpit.settings.executor.v1',
} as const;
const RUNTIME_MODE_KEY = 'cockpit.runtime.mode.v1';

export function CockpitSettingsPage() {
  const navigate = useNavigate();
  const { section } = useParams();
  const currentSection = useMemo<SectionId>(() => {
    const value = (section || 'general') as SectionId;
    return (SECTIONS as readonly string[]).includes(value) ? value : 'general';
  }, [section]);

  const [lastHealthRun, setLastHealthRun] = useState<string>('-');
  const [healthDetails, setHealthDetails] = useState('No checks run yet.');
  const [mcpRows, setMcpRows] = useState<MCPHealthRow[]>([
    { name: 'playwright', mode: 'isolated', status: 'unknown', note: 'Run health check to validate target binding.' },
    { name: 'plane', mode: 'share-safe', status: 'unknown', note: 'Ticketing API status not checked yet.' },
    { name: 'filesystem', mode: 'exclusive', status: 'unknown', note: 'Reserved for mutation wave guard.' },
  ]);
  const [inventory, setInventory] = useState<MCPServerEntry[]>([
    { id: 'playwright', name: 'Playwright', transport: 'stdio', mode: 'isolated', enabled: true },
    { id: 'plane', name: 'Plane', transport: 'http', mode: 'share-safe', enabled: true },
    { id: 'figma', name: 'Figma', transport: 'http', mode: 'exclusive', enabled: true, busyBy: 'agent:design-lead (eta 2m)' },
  ]);
  const [serverDraft, setServerDraft] = useState({ name: '', transport: 'http', mode: 'isolated' });
  const [testMessage, setTestMessage] = useState('No tests executed.');

  const [cliHealthMessage, setCliHealthMessage] = useState('CLI provider status not checked.');
  const [codexApiKeyForLogin, setCodexApiKeyForLogin] = useState('');
  const [runtimeCapabilities, setRuntimeCapabilities] = useState<{ effectiveMode: 'cli' | 'direct'; implicitCodexApiKey?: string }>({ effectiveMode: 'direct' });

  const [generalSavedAt, setGeneralSavedAt] = useState('Unsaved');
  const [appearanceSavedAt, setAppearanceSavedAt] = useState('Unsaved');
  const [personalizationSavedAt, setPersonalizationSavedAt] = useState('Unsaved');
  const [usageSavedAt, setUsageSavedAt] = useState('Unsaved');
  const [gitSavedAt, setGitSavedAt] = useState('Unsaved');
  const [environmentSavedAt, setEnvironmentSavedAt] = useState('Unsaved');
  const [worktreesSavedAt, setWorktreesSavedAt] = useState('Unsaved');
  const [archivedSavedAt, setArchivedSavedAt] = useState('Unsaved');
  const [executorSavedAt, setExecutorSavedAt] = useState('Unsaved');
  const [llmTestResult, setLlmTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    model?: string;
    provider?: string;
    response?: string;
    latencyMs?: number;
  } | null>(null);
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [governanceProjectId, setGovernanceProjectId] = useState('agent_system');
  const [governanceRules, setGovernanceRules] = useState<GovernanceRuleRow[]>([]);
  const [governanceState, setGovernanceState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [projectPolicy, setProjectPolicy] = useState<ProjectPolicyState | null>(null);
  const [overrideEditor, setOverrideEditor] = useState<{ ruleId: string; evidence: string; thresholdsJson: string }>({
    ruleId: '',
    evidence: '',
    thresholdsJson: '{}',
  });
  const [governanceEditor, setGovernanceEditor] = useState<{
    id: string;
    triggerPhases: string;
    evidence: string;
    deterministicCheck: string;
    thresholdsJson: string;
  }>({
    id: '',
    triggerPhases: '',
    evidence: '',
    deterministicCheck: '',
    thresholdsJson: '{}',
  });
  const [governanceMessage, setGovernanceMessage] = useState('');
  const [evaluators, setEvaluators] = useState<EvaluatorRow[]>([]);
  const [evaluatorAlias, setEvaluatorAlias] = useState<{ evaluatorType: string; aliasTo: string }>({
    evaluatorType: '',
    aliasTo: '',
  });

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    defaultOpenBehavior: 'finder',
    language: 'auto',
    commandDetail: 'steps',
    executionSpeed: 'standard',
    runtimeMode: 'multiple_agents',
  });
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    density: 'comfortable',
    accent: 'blue',
    fontScale: 'medium',
  });
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings>({
    assistantName: 'Swarm Controller',
    autoApproveSafeSteps: false,
    showHints: true,
    confirmLongActions: true,
  });
  const [usageSettings, setUsageSettings] = useState<UsageSettings>({
    detailLevel: 'steps',
    notifyOnCompletion: true,
    showTokenStats: true,
  });
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalyticsSummary>({
    totalEvents: 0,
    bySkill: {},
    byRole: {},
    byPipeline: {},
    unusedSkills: [],
  });
  const [skillAnalyticsState, setSkillAnalyticsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [gitSettings, setGitSettings] = useState<GitSettings>({
    enforcePreflight: true,
    requireWorktreeIsolation: true,
    autoRunCleanupSweep: true,
  });
  const [environmentSettings, setEnvironmentSettings] = useState<EnvironmentSettings>({
    executionMode: 'sandbox',
    allowNetwork: true,
    defaultShell: 'bash',
  });
  const [worktreeSettings, setWorktreeSettings] = useState<WorktreeSettings>({
    defaultBasePath: './agent-worktrees',
    autoPruneOnDone: true,
    strictOneTicketPerWorktree: true,
  });
  const [archivedThreadsSettings, setArchivedThreadsSettings] = useState<ArchivedThreadsSettings>({
    retentionDays: '180',
    includeArtifacts: true,
  });
  const [executorSettings, setExecutorSettings] = useState<ExecutorSettings>({
    backend: 'claude-cli',
    claude: { bin: 'claude', model: 'auto' },
    codex: { bin: 'codex', model: 'auto', sandbox: 'workspace-write' },
    openhands: { serverUrl: 'http://localhost:8000', model: 'anthropic/claude-3-5-sonnet', apiKeys: { anthropic: '', openai: '', google: '' } },
  });

  const providerModelPresets: Record<'claude-cli' | 'codex-cli' | 'openhands-sdk', string[]> = {
    'claude-cli': [
      'auto',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
    ],
    'codex-cli': [
      'auto',
      'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4-pro',
      'gpt-5.3-codex', 'gpt-5.2', 'gpt-5.1', 'gpt-5',
      'o4-mini', 'o3', 'o3-mini', 'o1', 'o1-pro',
    ],
    'openhands-sdk': [
      // Anthropic
      'anthropic/claude-sonnet-4-6',
      'anthropic/claude-opus-4-6',
      'anthropic/claude-haiku-4-5-20251001',
      'anthropic/claude-sonnet-4-5-20250929',
      'anthropic/claude-opus-4-5-20251101',
      'anthropic/claude-opus-4-20250514',
      'anthropic/claude-sonnet-4-20250514',
      // OpenAI
      'openai/gpt-4o', 'openai/gpt-4o-mini',
      'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4.1-nano',
      'openai/gpt-5', 'openai/gpt-5-mini', 'openai/gpt-5.4', 'openai/gpt-5.4-mini',
      'openai/o4-mini', 'openai/o3', 'openai/o3-mini', 'openai/o1',
      // Google Gemini 3.x
      'google/gemini-3.1-pro-preview',
      'google/gemini-3-flash-preview',
      'google/gemini-3.1-flash-lite-preview',
      // Google Gemini 2.5 (stable GA)
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
    ],
  };

  useEffect(() => {
    if (section && !(SECTIONS as readonly string[]).includes(section)) {
      navigate('/cockpit/settings/general', { replace: true });
    }
  }, [navigate, section]);

  useEffect(() => {
    const rawGeneral = localStorage.getItem(SETTINGS_KEYS.general);
    const rawAppearance = localStorage.getItem(SETTINGS_KEYS.appearance);
    const rawPersonalization = localStorage.getItem(SETTINGS_KEYS.personalization);
    const rawUsage = localStorage.getItem(SETTINGS_KEYS.usage);
    const rawGit = localStorage.getItem(SETTINGS_KEYS.git);
    const rawEnvironment = localStorage.getItem(SETTINGS_KEYS.environment);
    const rawWorktrees = localStorage.getItem(SETTINGS_KEYS.worktrees);
    const rawArchived = localStorage.getItem(SETTINGS_KEYS.archivedThreads);
    const rawExecutor = localStorage.getItem(SETTINGS_KEYS.executor);

    if (rawGeneral) {
      try {
        setGeneralSettings((prev) => ({ ...prev, ...JSON.parse(rawGeneral) }));
        setGeneralSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawAppearance) {
      try {
        setAppearanceSettings((prev) => ({ ...prev, ...JSON.parse(rawAppearance) }));
        setAppearanceSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawPersonalization) {
      try {
        setPersonalizationSettings((prev) => ({ ...prev, ...JSON.parse(rawPersonalization) }));
        setPersonalizationSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawUsage) {
      try {
        setUsageSettings((prev) => ({ ...prev, ...JSON.parse(rawUsage) }));
        setUsageSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawGit) {
      try {
        setGitSettings((prev) => ({ ...prev, ...JSON.parse(rawGit) }));
        setGitSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawEnvironment) {
      try {
        setEnvironmentSettings((prev) => ({ ...prev, ...JSON.parse(rawEnvironment) }));
        setEnvironmentSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawWorktrees) {
      try {
        setWorktreeSettings((prev) => ({ ...prev, ...JSON.parse(rawWorktrees) }));
        setWorktreesSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawArchived) {
      try {
        setArchivedThreadsSettings((prev) => ({ ...prev, ...JSON.parse(rawArchived) }));
        setArchivedSavedAt('Saved');
      } catch {
        // use default
      }
    }
    if (rawExecutor) {
      try {
        setExecutorSettings((prev) => ({ ...prev, ...JSON.parse(rawExecutor) }));
        setExecutorSavedAt('Saved');
      } catch {
        // use default
      }
    }
  }, []);

  useEffect(() => {
    if (currentSection !== 'governance') return;
    const loadGovernance = async () => {
      setGovernanceState('loading');
      try {
        const res = await fetch(apiUrl(`/api/governance/rules?projectId=${encodeURIComponent(governanceProjectId)}`));
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.rules)) throw new Error(data?.message || 'failed_to_load_rules');
        setGovernanceRules(data.rules);
        setGovernanceState('ready');
      } catch (error: any) {
        setGovernanceState('error');
        setGovernanceMessage(String(error?.message || 'Failed to load governance rules'));
      }
    };
    void loadGovernance();
    void loadEvaluators();
  }, [currentSection, governanceProjectId]);

  useEffect(() => {
    if (currentSection !== 'governance') return;
    const loadPolicy = async () => {
      try {
        const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(governanceProjectId)}/policy`));
        const data = await res.json();
        if (!data?.success || !data.policy) throw new Error(data?.message || 'failed_to_load_policy');
        setProjectPolicy(data.policy as ProjectPolicyState);
      } catch (error: any) {
        setGovernanceMessage(String(error?.message || 'Failed to load project policy'));
      }
    };
    void loadPolicy();
  }, [currentSection, governanceProjectId]);

  useEffect(() => {
    const loadGeneralFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/general'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setGeneralSettings((prev) => ({ ...prev, ...data.settings }));
        setGeneralSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadGeneralFromApi();
  }, []);

  useEffect(() => {
    const loadAppearanceFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/appearance'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setAppearanceSettings((prev) => ({ ...prev, ...data.settings }));
        setAppearanceSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadAppearanceFromApi();
  }, []);

  useEffect(() => {
    const loadPersonalizationFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/personalization'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setPersonalizationSettings((prev) => ({ ...prev, ...data.settings }));
        setPersonalizationSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadPersonalizationFromApi();
  }, []);

  useEffect(() => {
    const loadUsageFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/usage'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setUsageSettings((prev) => ({ ...prev, ...data.settings }));
        setUsageSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadUsageFromApi();
  }, []);

  useEffect(() => {
    const loadSkillAnalytics = async () => {
      setSkillAnalyticsState('loading');
      try {
        const res = await fetch(apiUrl('/api/cockpit/analytics/skills'));
        const data = await res.json();
        if (!data?.success || !data?.summary) throw new Error('invalid-analytics-payload');
        setSkillAnalytics({
          totalEvents: Number(data.summary.totalEvents || 0),
          bySkill: data.summary.bySkill || {},
          byRole: data.summary.byRole || {},
          byPipeline: data.summary.byPipeline || {},
          unusedSkills: Array.isArray(data.summary.unusedSkills) ? data.summary.unusedSkills : [],
        });
        setSkillAnalyticsState('ready');
      } catch {
        setSkillAnalyticsState('error');
      }
    };
    void loadSkillAnalytics();
  }, []);

  useEffect(() => {
    const loadGitFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/git'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setGitSettings((prev) => ({ ...prev, ...data.settings }));
        setGitSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadGitFromApi();
  }, []);

  useEffect(() => {
    const loadEnvironmentFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/environment'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setEnvironmentSettings((prev) => ({ ...prev, ...data.settings }));
        setEnvironmentSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadEnvironmentFromApi();
  }, []);

  useEffect(() => {
    const loadWorktreesFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/worktrees'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setWorktreeSettings((prev) => ({ ...prev, ...data.settings }));
        setWorktreesSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadWorktreesFromApi();
  }, []);

  useEffect(() => {
    const loadArchivedThreadsFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/archived-threads'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setArchivedThreadsSettings((prev) => ({ ...prev, ...data.settings }));
        setArchivedSavedAt('Saved');
      } catch {
        // Keep local fallback silently.
      }
    };
    void loadArchivedThreadsFromApi();
  }, []);

  useEffect(() => {
    const loadExecutorFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/settings/executor'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setExecutorSettings((prev) => ({
          ...prev,
          ...data.settings,
          openhands: {
            ...prev.openhands,
            ...(data.settings.openhands || {}),
            apiKeys: {
              ...(prev.openhands.apiKeys || {}),
              ...((data.settings.openhands || {}).apiKeys || {}),
            }
          }
        }));
        setExecutorSavedAt('Saved');
      } catch {
        // local fallback
      }
    };
    void loadExecutorFromApi();
  }, []);

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const res = await fetch(apiUrl('/api/cockpit/providers'));
        const data = await res.json();
        if (data.success && data.capabilities) {
          setRuntimeCapabilities(data.capabilities);
        }
      } catch {
        console.error('Failed to load runtime capabilities');
      }
    };
    void loadCapabilities();
  }, []);

  const runHealth = async () => {
    try {
      const [runtimeRes, catalogRes] = await Promise.all([
        fetch(apiUrl('/api/health')),
        fetch(apiUrl('/api/cockpit/catalog')),
      ]);
      const runtime = runtimeRes.ok ? 'ok' : 'warn';
      const catalog = catalogRes.ok ? 'ok' : 'warn';
      setLastHealthRun(new Date().toLocaleTimeString());
      setHealthDetails(`runtime=${runtime} | catalog=${catalog}`);
      setMcpRows((prev) =>
        prev.map((row) => ({
          ...row,
          status: row.name === 'playwright' ? (runtimeRes.ok ? 'ok' : 'warn') : catalogRes.ok ? 'ok' : 'warn',
        })),
      );
    } catch (e) {
      setLastHealthRun(new Date().toLocaleTimeString());
      setHealthDetails(`health check failed: ${(e as Error)?.message || 'unknown'}`);
      setMcpRows((prev) => prev.map((row) => ({ ...row, status: 'warn' })));
    }
  };

  const toggleServer = (id: string) => {
    setInventory((prev) => prev.map((row) => (row.id === id ? { ...row, enabled: !row.enabled } : row)));
  };

  const removeServer = (id: string) => {
    setInventory((prev) => prev.filter((row) => row.id !== id));
  };

  const addServer = () => {
    if (!serverDraft.name.trim()) return;
    const id = serverDraft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setInventory((prev) => {
      if (prev.some((row) => row.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name: serverDraft.name.trim(),
          transport: serverDraft.transport as MCPServerEntry['transport'],
          mode: serverDraft.mode as MCPServerEntry['mode'],
          enabled: true,
        },
      ];
    });
    setServerDraft({ name: '', transport: 'http', mode: 'isolated' });
  };

  const testServer = async (server: MCPServerEntry) => {
    if (server.mode === 'exclusive' && server.busyBy) {
      setTestMessage(`${server.name}: busy (${server.busyBy}). Added to queue.`);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/health'));
      setTestMessage(`${server.name}: ${res.ok ? 'PASS' : 'WARN'} (${server.transport}/${server.mode})`);
    } catch (e) {
      setTestMessage(`${server.name}: FAIL (${(e as Error)?.message || 'unknown'})`);
    }
  };

  const saveExecutorSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/executor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executorSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setExecutorSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || executorSettings;
      setExecutorSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.executor, JSON.stringify(next));
      setExecutorSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.executor, JSON.stringify(executorSettings));
      setExecutorSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const checkOpenHandsHealth = async () => {
    try {
      setCliHealthMessage('Checking OpenHands server status...');
      const res = await fetch(apiUrl('/api/cockpit/providers/openhands/health'));
      const data = await res.json();
      if (data.alive) {
        setCliHealthMessage(`OpenHands server is ALIVE at ${executorSettings.openhands.serverUrl}`);
      } else {
        setCliHealthMessage(`OpenHands server is UNREACHABLE: ${data.error || 'unknown'}`);
      }
    } catch (e) {
      setCliHealthMessage(`OpenHands health error: ${(e as Error)?.message || 'unknown'}`);
    }
  };

  const refreshCliStatus = async () => {
    try {
      setCliHealthMessage('Checking CLI providers...');
      const data = await fetchJsonStrict<CliStatusResponse>('/api/cockpit/providers/cli/status');
      if (!data.success || !data.status) {
        setCliHealthMessage(`CLI status failed: ${data.error || 'unknown'}`);
        return;
      }
      const codex = data.status.codex;
      const claude = data.status.claude;
      setCliHealthMessage(`codex loggedIn=${Boolean(codex?.loggedIn)} | claude loggedIn=${Boolean(claude?.loggedIn)}${claude?.needsLogin ? ' (needs login)' : ''}`);
    } catch (e) {
      setCliHealthMessage(`CLI status error: ${(e as Error)?.message || 'unknown'}`);
    }
  };

  const testLlmConfig = async () => {
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await fetch(apiUrl('/api/cockpit/providers/test-message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: executorSettings.openhands.model,
          apiKeys: executorSettings.openhands.apiKeys,
        }),
      });
      const data = await res.json();
      setLlmTestResult(data);
    } catch (e) {
      setLlmTestResult({
        success: false,
        status: 'fetch_error',
        message: (e as Error)?.message || 'Network or internal server error',
      });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const testCliProvider = async (provider: 'codex-cli' | 'claude-cli') => {
    try {
      setCliHealthMessage(`Testing ${provider}...`);
      const model = provider === 'codex-cli' ? executorSettings.codex.model : executorSettings.claude.model;
      const data = await fetchJsonStrict<CliTestResponse>('/api/cockpit/providers/cli/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      });
      let errorReason = data?.error || data?.result?.stderr || 'unknown';
      if (!data.success && data?.result?.stdout) {
        const lines = data.result.stdout.split('\n').map((r: string) => r.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.type === 'error' && parsed.message) {
               errorReason = parsed.message;
               break;
            }
            } catch {
              // Ignore invalid JSON lines
            }
        }
      }

      setCliHealthMessage(
        data.success
          ? `${provider}: PASS`
          : `${provider}: FAIL - ${errorReason}`,
      );
    } catch (e) {
      setCliHealthMessage(`${provider} test error: ${(e as Error)?.message || 'unknown'}`);
    }
  };

  const loginCodexWithApiKey = async () => {
    try {
      if (!codexApiKeyForLogin.trim()) {
        setCliHealthMessage('Codex login requires API key.');
        return;
      }
      setCliHealthMessage('Running codex login --with-api-key ...');
      const data = await fetchJsonStrict<CliLoginResponse>('/api/cockpit/providers/cli/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'codex-cli', method: 'api-key', apiKey: codexApiKeyForLogin }),
      });
      setCliHealthMessage(data.success ? 'Codex login: PASS' : `Codex login: FAIL (${data?.result?.stderr || data?.error || data?.message || 'unknown'})`);
      setCodexApiKeyForLogin('');
    } catch (e) {
      setCliHealthMessage(`Codex login error: ${(e as Error)?.message || 'unknown'}`);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/general'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setGeneralSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || generalSettings;
      setGeneralSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.general, JSON.stringify(next));
      localStorage.setItem(RUNTIME_MODE_KEY, next.runtimeMode || generalSettings.runtimeMode);
      setGeneralSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.general, JSON.stringify(generalSettings));
      localStorage.setItem(RUNTIME_MODE_KEY, generalSettings.runtimeMode);
      setGeneralSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveAppearanceSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/appearance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appearanceSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setAppearanceSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || appearanceSettings;
      setAppearanceSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.appearance, JSON.stringify(next));
      setAppearanceSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.appearance, JSON.stringify(appearanceSettings));
      setAppearanceSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const savePersonalizationSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/personalization'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalizationSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setPersonalizationSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || personalizationSettings;
      setPersonalizationSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.personalization, JSON.stringify(next));
      setPersonalizationSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.personalization, JSON.stringify(personalizationSettings));
      setPersonalizationSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveUsageSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/usage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setUsageSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || usageSettings;
      setUsageSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.usage, JSON.stringify(next));
      setUsageSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.usage, JSON.stringify(usageSettings));
      setUsageSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveGitSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/git'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gitSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setGitSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || gitSettings;
      setGitSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.git, JSON.stringify(next));
      setGitSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.git, JSON.stringify(gitSettings));
      setGitSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveEnvironmentSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/environment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(environmentSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setEnvironmentSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || environmentSettings;
      setEnvironmentSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.environment, JSON.stringify(next));
      setEnvironmentSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.environment, JSON.stringify(environmentSettings));
      setEnvironmentSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveWorktreeSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/worktrees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(worktreeSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setWorktreesSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || worktreeSettings;
      setWorktreeSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.worktrees, JSON.stringify(next));
      setWorktreesSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.worktrees, JSON.stringify(worktreeSettings));
      setWorktreesSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const saveArchivedSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/cockpit/settings/archived-threads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archivedThreadsSettings),
      });
      const data = await res.json();
      if (!data.success) {
        setArchivedSavedAt(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || archivedThreadsSettings;
      setArchivedThreadsSettings((prev) => ({ ...prev, ...next }));
      localStorage.setItem(SETTINGS_KEYS.archivedThreads, JSON.stringify(next));
      setArchivedSavedAt(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      localStorage.setItem(SETTINGS_KEYS.archivedThreads, JSON.stringify(archivedThreadsSettings));
      setArchivedSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const refreshGovernanceRules = async () => {
    try {
      setGovernanceState('loading');
      const res = await fetch(apiUrl(`/api/governance/rules?projectId=${encodeURIComponent(governanceProjectId)}`));
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.rules)) throw new Error(data?.message || 'failed_to_load_rules');
      setGovernanceRules(data.rules);
      setGovernanceState('ready');
    } catch (error: any) {
      setGovernanceState('error');
      setGovernanceMessage(String(error?.message || 'Failed to load governance rules'));
    }
  };

  const toggleRuleForProject = async (ruleId: string, currentlyEnabled: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/governance/rules/${encodeURIComponent(ruleId)}/disable`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: governanceProjectId,
          disabled: currentlyEnabled,
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'toggle_failed');
      setGovernanceMessage(`Rule ${ruleId} ${currentlyEnabled ? 'disabled' : 'enabled'} for project ${governanceProjectId}.`);
      await refreshGovernanceRules();
    } catch (error: any) {
      setGovernanceMessage(`Toggle failed: ${String(error?.message || 'unknown')}`);
    }
  };

  const saveGovernanceRule = async () => {
    try {
      if (!governanceEditor.id.trim()) {
        setGovernanceMessage('Rule id is required');
        return;
      }
      const triggerPhases = governanceEditor.triggerPhases
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (triggerPhases.length === 0) {
        setGovernanceMessage('Validation failed: at least one trigger phase is required.');
        return;
      }
      const evidence = governanceEditor.evidence
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
      if (evidence.length === 0) {
        setGovernanceMessage('Validation failed: at least one evidence line is required.');
        return;
      }
      const thresholds = JSON.parse(governanceEditor.thresholdsJson || '{}');
      if (thresholds && typeof thresholds === 'object') {
        for (const [key, value] of Object.entries(thresholds)) {
          if (!Number.isFinite(Number(value))) {
            setGovernanceMessage(`Validation failed: threshold "${key}" must be numeric.`);
            return;
          }
        }
      }
      const payload = {
        id: governanceEditor.id.trim(),
        triggerPhases,
        evidence,
        deterministicCheck: governanceEditor.deterministicCheck.trim() || undefined,
        thresholds,
      };
      const exists = governanceRules.some((r) => r.id === payload.id);
      const endpoint = exists ? `/api/governance/rules/${encodeURIComponent(payload.id)}` : '/api/governance/rules';
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'save_rule_failed');
      setGovernanceMessage(`${exists ? 'Updated' : 'Created'} rule ${payload.id}.`);
      await refreshGovernanceRules();
    } catch (error: any) {
      setGovernanceMessage(`Save failed: ${String(error?.message || 'unknown')}`);
    }
  };

  const savePolicyOverride = async () => {
    try {
      if (!overrideEditor.ruleId.trim()) {
        setGovernanceMessage('Select rule ID for override.');
        return;
      }
      const thresholds = JSON.parse(overrideEditor.thresholdsJson || '{}');
      const evidence = overrideEditor.evidence
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
      const nextOverrides = {
        ...(projectPolicy?.ruleOverrides || {}),
        [overrideEditor.ruleId]: {
          ...(evidence.length > 0 ? { evidence } : {}),
          ...(thresholds && typeof thresholds === 'object' ? { thresholds } : {}),
        },
      };
      const res = await fetch(apiUrl(`/api/projects/${encodeURIComponent(governanceProjectId)}/policy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleOverrides: nextOverrides }),
      });
      const data = await res.json();
      if (!data?.success || !data?.policy) throw new Error(data?.message || 'policy_override_save_failed');
      setProjectPolicy(data.policy as ProjectPolicyState);
      setGovernanceMessage(`Saved override for ${overrideEditor.ruleId}.`);
      await refreshGovernanceRules();
    } catch (error: any) {
      setGovernanceMessage(`Override save failed: ${String(error?.message || 'unknown')}`);
    }
  };

  const loadEvaluators = async () => {
    try {
      const res = await fetch(apiUrl('/api/governance/evaluators'));
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.evaluators)) throw new Error(data?.message || 'failed_to_load_evaluators');
      setEvaluators(data.evaluators as EvaluatorRow[]);
    } catch (error: any) {
      setGovernanceMessage(`Evaluator list failed: ${String(error?.message || 'unknown')}`);
    }
  };

  const registerEvaluatorAlias = async () => {
    try {
      if (!evaluatorAlias.evaluatorType.trim() || !evaluatorAlias.aliasTo.trim()) {
        setGovernanceMessage('Evaluator alias validation failed: evaluatorType and aliasTo are required.');
        return;
      }
      const res = await fetch(apiUrl('/api/governance/evaluators/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorType: evaluatorAlias.evaluatorType.trim(),
          aliasTo: evaluatorAlias.aliasTo.trim(),
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'register_evaluator_failed');
      setGovernanceMessage(`Evaluator alias created: ${data.evaluatorType} -> ${data.aliasTo}`);
      await loadEvaluators();
    } catch (error: any) {
      setGovernanceMessage(`Evaluator alias failed: ${String(error?.message || 'unknown')}`);
    }
  };

  const sectionTitle = currentSection.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const settingsCardClass = 'mb-3 rounded-xl border border-slate-700 bg-slate-900 p-3.5';
  const settingsNoteClass = 'mb-3 text-sm text-slate-400';
  const settingsMetaClass = 'mt-2 text-xs text-slate-400';
  const settingsGridClass =
    'grid grid-cols-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 md:grid-cols-2 ' +
    '[&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:border-b [&_label]:border-slate-800 [&_label]:p-2.5 [&_label]:text-xs [&_label]:text-slate-300 ' +
    'md:[&_label:nth-child(odd)]:border-r md:[&_label:nth-last-child(-n+2)]:border-b-0 ' +
    '[&_select]:rounded-md [&_select]:border [&_select]:border-slate-600 [&_select]:bg-slate-800 [&_select]:px-2.5 [&_select]:py-1.5 [&_select]:text-sm [&_select]:text-slate-100 ' +
    '[&_input]:rounded-md [&_input]:border [&_input]:border-slate-600 [&_input]:bg-slate-800 [&_input]:px-2.5 [&_input]:py-1.5 [&_input]:text-sm [&_input]:text-slate-100';

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#121315] text-slate-200 lg:grid-cols-[266px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-900 px-2.5 pb-3.5 pt-3 lg:border-b-0 lg:border-r lg:border-r-slate-800">
        <Link className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 no-underline transition-colors hover:text-slate-100" to="/cockpit/runtime">
          <ChevronLeft size={16} />
          Back To Cockpit
        </Link>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((id) => (
            <Link
              key={id}
              to={`/cockpit/settings/${id}`}
              className={`block rounded-md px-2.5 py-2 text-sm no-underline transition-colors ${
                currentSection === id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {id.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="w-full max-w-[1040px] px-4 py-5 lg:px-6">
        <header className="mb-4">
          <h1 className="m-0 text-3xl font-semibold leading-tight text-slate-100">{sectionTitle}</h1>
          <p className="mb-0 mt-2 text-sm text-slate-400">Codex-style settings IA scaffold with functional controls.</p>
        </header>

        {currentSection === 'general' && (
          <section className={settingsCardClass}>
            <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-100"><SlidersHorizontal size={16} />Core Defaults</h2>
            <div className={settingsGridClass}>
              <label>Default Open Behavior<select value={generalSettings.defaultOpenBehavior} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, defaultOpenBehavior: e.target.value as GeneralSettings['defaultOpenBehavior'] }))}><option value="finder">Finder</option><option value="editor">Editor</option><option value="terminal">Terminal</option></select></label>
              <label>Language<select value={generalSettings.language} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, language: e.target.value as GeneralSettings['language'] }))}><option value="auto">Auto Detect</option><option value="uk">Ukrainian</option><option value="en">English</option></select></label>
              <label>Command Detail<select value={generalSettings.commandDetail} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, commandDetail: e.target.value as GeneralSettings['commandDetail'] }))}><option value="steps">Code Steps</option><option value="verbose">Verbose Logs</option><option value="minimal">Minimal</option></select></label>
              <label>Execution Speed<select value={generalSettings.executionSpeed} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, executionSpeed: e.target.value as GeneralSettings['executionSpeed'] }))}><option value="standard">Standard</option><option value="fast">Fast</option><option value="deep">Deep Reasoning</option></select></label>
              <label>Execution Runtime Mode<select value={generalSettings.runtimeMode} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, runtimeMode: e.target.value as GeneralSettings['runtimeMode'] }))}><option value="mock">Mock</option><option value="linear">Quasi-Linear</option><option value="multiple_agents">Multiple Agents</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveGeneralSettings}>Save General Settings</Button></div>
            <div className={settingsMetaClass}>{generalSavedAt}</div>
          </section>
        )}

        {currentSection === 'appearance' && (
          <section className={settingsCardClass}>
            <h2>Appearance Configuration</h2>
            <div className={settingsGridClass}>
              <label>Theme<select value={appearanceSettings.theme} onChange={(e) => setAppearanceSettings((prev) => ({ ...prev, theme: e.target.value as AppearanceSettings['theme'] }))}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
              <label>Density<select value={appearanceSettings.density} onChange={(e) => setAppearanceSettings((prev) => ({ ...prev, density: e.target.value as AppearanceSettings['density'] }))}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
              <label>Accent<select value={appearanceSettings.accent} onChange={(e) => setAppearanceSettings((prev) => ({ ...prev, accent: e.target.value as AppearanceSettings['accent'] }))}><option value="blue">Blue</option><option value="emerald">Emerald</option><option value="violet">Violet</option></select></label>
              <label>Font Scale<select value={appearanceSettings.fontScale} onChange={(e) => setAppearanceSettings((prev) => ({ ...prev, fontScale: e.target.value as AppearanceSettings['fontScale'] }))}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveAppearanceSettings}>Save Appearance</Button></div>
            <div className={settingsMetaClass}>{appearanceSavedAt}</div>
          </section>
        )}

        {currentSection === 'personalization' && (
          <section className={settingsCardClass}>
            <h2>Personalization</h2>
            <div className={settingsGridClass}>
              <label>Assistant Name<input value={personalizationSettings.assistantName} onChange={(e) => setPersonalizationSettings((prev) => ({ ...prev, assistantName: e.target.value }))} /></label>
              <label>Auto-approve Safe Steps<select value={String(personalizationSettings.autoApproveSafeSteps)} onChange={(e) => setPersonalizationSettings((prev) => ({ ...prev, autoApproveSafeSteps: e.target.value === 'true' }))}><option value="false">Off</option><option value="true">On</option></select></label>
              <label>Show Hints<select value={String(personalizationSettings.showHints)} onChange={(e) => setPersonalizationSettings((prev) => ({ ...prev, showHints: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Confirm Long Actions<select value={String(personalizationSettings.confirmLongActions)} onChange={(e) => setPersonalizationSettings((prev) => ({ ...prev, confirmLongActions: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={savePersonalizationSettings}>Save Personalization</Button></div>
            <div className={settingsMetaClass}>{personalizationSavedAt}</div>
          </section>
        )}

        {currentSection === 'governance' && (
          <>
            <section className={settingsCardClass}>
              <h2><ShieldCheck size={16} />Governance Rule Catalog</h2>
              <p className={settingsNoteClass}>Project-scoped rule visibility and lifecycle controls.</p>
              <div className={settingsGridClass}>
                <label>
                  Project ID
                  <input value={governanceProjectId} onChange={(e) => setGovernanceProjectId(e.target.value)} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={refreshGovernanceRules}>Refresh Rules</Button>
              </div>
              <div className={settingsMetaClass}>
                {governanceState === 'loading' ? 'Loading...' : `Rules loaded: ${governanceRules.length}`}
              </div>
              {governanceMessage && <div className="mt-2 text-xs text-slate-300">{governanceMessage}</div>}
              <div className="mt-3 flex flex-col gap-2">
                {governanceRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-slate-700 bg-slate-950 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{rule.metadata?.name || rule.id}</div>
                        <div className="text-xs text-slate-400">{rule.id} · {rule.enforcementMode} · {rule.evaluationType}</div>
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100"
                        onClick={() => toggleRuleForProject(rule.id, Boolean(rule.effectiveEnabled))}
                      >
                        {rule.effectiveEnabled ? 'Disable For Project' : 'Enable For Project'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-300">
                      Trigger: {(rule.triggerPhases || []).join(', ') || 'n/a'}<br />
                      Check: {rule.deterministicCheck || 'n/a'}
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        onClick={() =>
                          setGovernanceEditor({
                            id: rule.id,
                            triggerPhases: (rule.triggerPhases || []).join(','),
                            evidence: (rule.evidence || []).join('\n'),
                            deterministicCheck: rule.deterministicCheck || '',
                            thresholdsJson: JSON.stringify(rule.thresholds || {}, null, 2),
                          })
                        }
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className={settingsCardClass}>
              <h2><SlidersHorizontal size={16} />Rule Editor (Basic)</h2>
              <div className={settingsGridClass}>
                <label>Rule ID<input value={governanceEditor.id} onChange={(e) => setGovernanceEditor((p) => ({ ...p, id: e.target.value }))} /></label>
                <label>Trigger Phases (comma separated)<input value={governanceEditor.triggerPhases} onChange={(e) => setGovernanceEditor((p) => ({ ...p, triggerPhases: e.target.value }))} /></label>
                <label>Deterministic Check<input value={governanceEditor.deterministicCheck} onChange={(e) => setGovernanceEditor((p) => ({ ...p, deterministicCheck: e.target.value }))} /></label>
                <label>Evidence (one per line)<textarea className="min-h-24 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100" value={governanceEditor.evidence} onChange={(e) => setGovernanceEditor((p) => ({ ...p, evidence: e.target.value }))} /></label>
                <label>Thresholds JSON<textarea className="min-h-24 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100" value={governanceEditor.thresholdsJson} onChange={(e) => setGovernanceEditor((p) => ({ ...p, thresholdsJson: e.target.value }))} /></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={saveGovernanceRule}>Save Rule</Button>
              </div>
            </section>
            <section className={settingsCardClass}>
              <h2><ShieldCheck size={16} />Project Policy & Overrides</h2>
              <div className={settingsMetaClass}>
                {projectPolicy
                  ? `Enabled: ${projectPolicy.enabledRules.length} · Disabled: ${projectPolicy.disabledRules.length} · Overrides: ${Object.keys(projectPolicy.ruleOverrides || {}).length}`
                  : 'Policy not loaded yet.'}
              </div>
              <div className={settingsGridClass}>
                <label>
                  Override Rule ID
                  <input
                    value={overrideEditor.ruleId}
                    onChange={(e) => setOverrideEditor((p) => ({ ...p, ruleId: e.target.value }))}
                    placeholder="e.g. cost_guard_light"
                  />
                </label>
                <label>
                  Override Evidence (one per line)
                  <textarea
                    className="min-h-24 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
                    value={overrideEditor.evidence}
                    onChange={(e) => setOverrideEditor((p) => ({ ...p, evidence: e.target.value }))}
                  />
                </label>
                <label>
                  Override Thresholds JSON
                  <textarea
                    className="min-h-24 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
                    value={overrideEditor.thresholdsJson}
                    onChange={(e) => setOverrideEditor((p) => ({ ...p, thresholdsJson: e.target.value }))}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={savePolicyOverride}>Save Project Override</Button>
              </div>
            </section>
            <section className={settingsCardClass}>
              <h2><ShieldCheck size={16} />Evaluator Registry</h2>
              <div className={settingsMetaClass}>Total evaluators: {evaluators.length}</div>
              <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {evaluators.map((row) => (
                  <div key={row.evaluatorType} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300">
                    <strong className="text-slate-100">{row.evaluatorType}</strong> · {row.isBuiltin ? 'builtin' : 'plugin'}
                  </div>
                ))}
              </div>
              <div className={settingsGridClass + ' mt-3'}>
                <label>
                  New Evaluator Type
                  <input
                    value={evaluatorAlias.evaluatorType}
                    onChange={(e) => setEvaluatorAlias((p) => ({ ...p, evaluatorType: e.target.value }))}
                    placeholder="e.g. my_custom_check"
                  />
                </label>
                <label>
                  Alias To Existing
                  <input
                    value={evaluatorAlias.aliasTo}
                    onChange={(e) => setEvaluatorAlias((p) => ({ ...p, aliasTo: e.target.value }))}
                    placeholder="e.g. postflight_report"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={registerEvaluatorAlias}>Register Alias</Button>
                <Button variant="secondary" onClick={loadEvaluators}>Refresh Evaluators</Button>
              </div>
            </section>
          </>
        )}

        {currentSection === 'usage' && (
          <section className={settingsCardClass}>
            <h2>Usage Preferences</h2>
            <div className={settingsGridClass}>
              <label>Detail Level<select value={usageSettings.detailLevel} onChange={(e) => setUsageSettings((prev) => ({ ...prev, detailLevel: e.target.value as UsageSettings['detailLevel'] }))}><option value="minimal">Minimal</option><option value="steps">Steps</option><option value="verbose">Verbose</option></select></label>
              <label>Notify On Completion<select value={String(usageSettings.notifyOnCompletion)} onChange={(e) => setUsageSettings((prev) => ({ ...prev, notifyOnCompletion: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Show Token Stats<select value={String(usageSettings.showTokenStats)} onChange={(e) => setUsageSettings((prev) => ({ ...prev, showTokenStats: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveUsageSettings}>Save Usage</Button></div>
            <div className={settingsMetaClass}>{usageSavedAt}</div>

            <div className="my-3 border-t border-slate-700" />
            <h2>Skill Telemetry Analytics</h2>
            <p className={settingsNoteClass}>Live runtime metrics from the skill telemetry registry.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  setSkillAnalyticsState('loading');
                  try {
                    const res = await fetch(apiUrl('/api/cockpit/analytics/skills'));
                    const data = await res.json();
                    if (!data?.success || !data?.summary) throw new Error('invalid-analytics-payload');
                    setSkillAnalytics({
                      totalEvents: Number(data.summary.totalEvents || 0),
                      bySkill: data.summary.bySkill || {},
                      byRole: data.summary.byRole || {},
                      byPipeline: data.summary.byPipeline || {},
                      unusedSkills: Array.isArray(data.summary.unusedSkills) ? data.summary.unusedSkills : [],
                    });
                    setSkillAnalyticsState('ready');
                  } catch {
                    setSkillAnalyticsState('error');
                  }
                }}
              >
                Refresh Skill Analytics
              </Button>
            </div>
            <div className={settingsMetaClass}>
              {skillAnalyticsState === 'loading' && 'Loading analytics...'}
              {skillAnalyticsState === 'error' && 'Analytics endpoint unavailable.'}
              {(skillAnalyticsState === 'ready' || skillAnalyticsState === 'idle') &&
                `Total skill invocations: ${skillAnalytics.totalEvents}`}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 [&_h3]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-slate-200 [&_p]:text-xs [&_p]:text-slate-400 [&_ul]:m-0 [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:p-0 [&_li]:flex [&_li]:justify-between [&_li]:gap-2 [&_li]:text-xs [&_li]:text-slate-300 [&_li_strong]:font-semibold [&_li_strong]:text-slate-100">
                <h3>By Skill</h3>
                {Object.keys(skillAnalytics.bySkill).length === 0 ? (
                  <p>No skill events yet.</p>
                ) : (
                  <ul>
                    {Object.entries(skillAnalytics.bySkill)
                      .sort((a, b) => b[1] - a[1])
                      .map(([skill, count]) => (
                        <li key={skill}><span>{skill}</span><strong>{count}</strong></li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 [&_h3]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-slate-200 [&_p]:text-xs [&_p]:text-slate-400 [&_ul]:m-0 [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:p-0 [&_li]:flex [&_li]:justify-between [&_li]:gap-2 [&_li]:text-xs [&_li]:text-slate-300 [&_li_strong]:font-semibold [&_li_strong]:text-slate-100">
                <h3>By Role</h3>
                {Object.keys(skillAnalytics.byRole).length === 0 ? (
                  <p>No role metrics yet.</p>
                ) : (
                  <ul>
                    {Object.entries(skillAnalytics.byRole)
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, count]) => (
                        <li key={role}><span>{role}</span><strong>{count}</strong></li>
                      ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 [&_h3]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-slate-200 [&_p]:text-xs [&_p]:text-slate-400 [&_ul]:m-0 [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:p-0 [&_li]:flex [&_li]:justify-between [&_li]:gap-2 [&_li]:text-xs [&_li]:text-slate-300 [&_li_strong]:font-semibold [&_li_strong]:text-slate-100">
                <h3>By Pipeline</h3>
                {Object.keys(skillAnalytics.byPipeline).length === 0 ? (
                  <p>No pipeline metrics yet.</p>
                ) : (
                  <ul>
                    {Object.entries(skillAnalytics.byPipeline)
                      .sort((a, b) => b[1] - a[1])
                      .map(([pipeline, count]) => (
                        <li key={pipeline}><span>{pipeline}</span><strong>{count}</strong></li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5 [&_h3]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-slate-200 [&_p]:text-xs [&_p]:text-slate-400 [&_ul]:m-0 [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:p-0 [&_li]:flex [&_li]:justify-between [&_li]:gap-2 [&_li]:text-xs [&_li]:text-slate-300 [&_li_strong]:font-semibold [&_li_strong]:text-slate-100">
              <h3>Unused Skills</h3>
              {skillAnalytics.unusedSkills.length === 0 ? (
                <p>All registered skills have usage signals.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5 [&_li]:rounded-full [&_li]:border [&_li]:border-slate-700 [&_li]:bg-slate-800 [&_li]:px-2 [&_li]:py-0.5 [&_li]:text-xs [&_li]:text-slate-300">
                  {skillAnalytics.unusedSkills.slice(0, 20).map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {currentSection === 'git' && (
          <section className={settingsCardClass}>
            <h2>Git Controls</h2>
            <div className={settingsGridClass}>
              <label>Enforce Preflight<select value={String(gitSettings.enforcePreflight)} onChange={(e) => setGitSettings((prev) => ({ ...prev, enforcePreflight: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Require Worktree Isolation<select value={String(gitSettings.requireWorktreeIsolation)} onChange={(e) => setGitSettings((prev) => ({ ...prev, requireWorktreeIsolation: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Auto Cleanup Sweep<select value={String(gitSettings.autoRunCleanupSweep)} onChange={(e) => setGitSettings((prev) => ({ ...prev, autoRunCleanupSweep: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveGitSettings}>Save Git Controls</Button></div>
            <div className={settingsMetaClass}>{gitSavedAt}</div>
          </section>
        )}

        {currentSection === 'environment' && (
          <section className={settingsCardClass}>
            <h2>Environment Defaults</h2>
            <div className={settingsGridClass}>
              <label>Execution Mode<select value={environmentSettings.executionMode} onChange={(e) => setEnvironmentSettings((prev) => ({ ...prev, executionMode: e.target.value as EnvironmentSettings['executionMode'] }))}><option value="sandbox">Sandbox</option><option value="full-access">Full Access</option></select></label>
              <label>Allow Network<select value={String(environmentSettings.allowNetwork)} onChange={(e) => setEnvironmentSettings((prev) => ({ ...prev, allowNetwork: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Default Shell<select value={environmentSettings.defaultShell} onChange={(e) => setEnvironmentSettings((prev) => ({ ...prev, defaultShell: e.target.value as EnvironmentSettings['defaultShell'] }))}><option value="bash">bash</option><option value="zsh">zsh</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveEnvironmentSettings}>Save Environment</Button></div>
            <div className={settingsMetaClass}>{environmentSavedAt}</div>
          </section>
        )}

        {currentSection === 'worktrees' && (
          <section className={settingsCardClass}>
            <h2>Worktree Policy</h2>
            <div className={settingsGridClass}>
              <label>Default Base Path<input value={worktreeSettings.defaultBasePath} onChange={(e) => setWorktreeSettings((prev) => ({ ...prev, defaultBasePath: e.target.value }))} /></label>
              <label>Auto Prune On Done<select value={String(worktreeSettings.autoPruneOnDone)} onChange={(e) => setWorktreeSettings((prev) => ({ ...prev, autoPruneOnDone: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Strict One Ticket/Worktree<select value={String(worktreeSettings.strictOneTicketPerWorktree)} onChange={(e) => setWorktreeSettings((prev) => ({ ...prev, strictOneTicketPerWorktree: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveWorktreeSettings}>Save Worktree Policy</Button></div>
            <div className={settingsMetaClass}>{worktreesSavedAt}</div>
          </section>
        )}

        {currentSection === 'archived-threads' && (
          <section className={settingsCardClass}>
            <h2>Archived Threads</h2>
            <div className={settingsGridClass}>
              <label>Retention<select value={archivedThreadsSettings.retentionDays} onChange={(e) => setArchivedThreadsSettings((prev) => ({ ...prev, retentionDays: e.target.value as ArchivedThreadsSettings['retentionDays'] }))}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></label>
              <label>Include Artifacts<select value={String(archivedThreadsSettings.includeArtifacts)} onChange={(e) => setArchivedThreadsSettings((prev) => ({ ...prev, includeArtifacts: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={saveArchivedSettings}>Save Archive Settings</Button></div>
            <div className={settingsMetaClass}>{archivedSavedAt}</div>
          </section>
        )}

        {currentSection === 'mcp-servers' && (
          <>
            <section className={settingsCardClass}>
              <h2><Server size={16} />MCP Server Workbench</h2>
              <p className={settingsNoteClass}>Shared-tool governance preview: isolated, share-safe, and exclusive modes.</p>
              <Button variant="secondary" onClick={runHealth}>Run MCP Health Report</Button>
              <div className={settingsMetaClass}>Last check: {lastHealthRun}</div>
              <div className={settingsMetaClass}>{healthDetails}</div>
              <div className={settingsMetaClass}>Server test result: {testMessage}</div>
              <div className="mt-3 grid grid-cols-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 lg:grid-cols-[180px_120px_90px_1fr] [&>div]:border-b [&>div]:border-slate-800 [&>div]:px-2.5 [&>div]:py-2">
                <div className="hidden bg-slate-900 text-xs uppercase tracking-wide text-slate-500 lg:block">Server</div>
                <div className="hidden bg-slate-900 text-xs uppercase tracking-wide text-slate-500 lg:block">Mode</div>
                <div className="hidden bg-slate-900 text-xs uppercase tracking-wide text-slate-500 lg:block">Status</div>
                <div className="hidden bg-slate-900 text-xs uppercase tracking-wide text-slate-500 lg:block">Note</div>
                {mcpRows.map((row) => (
                  <React.Fragment key={row.name}>
                    <div>{row.name}</div>
                    <div>{row.mode}</div>
                    <div className={row.status === 'ok' ? 'text-emerald-400' : row.status === 'warn' ? 'text-amber-300' : 'text-slate-400'}>
                      {row.status}
                    </div>
                    <div>{row.note}</div>
                  </React.Fragment>
                ))}
              </div>
            </section>
            <section className={settingsCardClass}>
              <h2><ShieldCheck size={16} />Connection Testing</h2>
              <p className={settingsNoteClass}>Inventory management and per-server test actions (UI-first shell).</p>
              <div className={settingsGridClass}>
                <label>Server Name<input value={serverDraft.name} onChange={(e) => setServerDraft((p) => ({ ...p, name: e.target.value }))} placeholder="New MCP server" /></label>
                <label>Transport<select value={serverDraft.transport} onChange={(e) => setServerDraft((p) => ({ ...p, transport: e.target.value }))}><option value="http">http</option><option value="stdio">stdio</option><option value="sse">sse</option></select></label>
                <label>Mode<select value={serverDraft.mode} onChange={(e) => setServerDraft((p) => ({ ...p, mode: e.target.value }))}><option value="isolated">isolated</option><option value="share-safe">share-safe</option><option value="exclusive">exclusive</option></select></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={addServer}>Add Server</Button></div>
              <div className="mt-3 flex flex-col gap-2">
                {inventory.map((server) => (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2" key={server.id}>
                    <div>
                      <strong>{server.name}</strong> <span className={settingsMetaClass}>({server.transport}, {server.mode})</span>
                      <div className={settingsMetaClass}>{server.busyBy ? `busy: ${server.busyBy}` : 'available'}</div>
                    </div>
                    <div className="flex gap-1.5 [&>button]:rounded-md [&>button]:border [&>button]:border-slate-600 [&>button]:bg-slate-800 [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:text-xs [&>button]:text-slate-100 [&>button]:transition-colors hover:[&>button]:border-slate-500 hover:[&>button]:bg-slate-700">
                      <button type="button" onClick={() => toggleServer(server.id)}>{server.enabled ? 'Disable' : 'Enable'}</button>
                      <button type="button" onClick={() => testServer(server)}>Test</button>
                      <button type="button" onClick={() => removeServer(server.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {currentSection === 'configuration' && (
          <section className={settingsCardClass}>
            <h2><ShieldCheck size={16} />Provider & Executor Configuration</h2>
            <p className={settingsNoteClass}>Primary configuration for intelligence backend and CLI execution engine.</p>
            
            <h3>Executor Backend</h3>
            <p className={settingsNoteClass}>Select primary execution model. (Direct API vs Native CLI).</p>
            <div className={settingsGridClass}>
              <label>Execution Target<select value={executorSettings.backend} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, backend: e.target.value as ExecutorSettings['backend'] }))}><option value="claude-cli">Claude Code CLI</option><option value="codex-cli">Codex CLI</option><option value="openhands-sdk">OpenHands SDK (Sidecar Server)</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={saveExecutorSettings}>Save Execution Target</Button>
            </div>
            <div className={settingsMetaClass}>{executorSavedAt}</div>

            <hr />

                <h3>CLI Agent Configuration</h3>
                <p className={settingsNoteClass}>Configure paths and models for {executorSettings.backend}.</p>
                <div className={settingsGridClass}>
                  {executorSettings.backend === 'claude-cli' && (
                    <>
                      <label>Claude Binary<input value={executorSettings.claude.bin} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, claude: { ...prev.claude, bin: e.target.value } }))} placeholder="/opt/homebrew/bin/claude" /></label>
                      <label>Claude Model<select value={executorSettings.claude.model} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, claude: { ...prev.claude, model: e.target.value } }))}>{providerModelPresets['claude-cli'].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
                    </>
                  )}
                  {executorSettings.backend === 'codex-cli' && (
                    <>
                      <label>Codex Binary<input value={executorSettings.codex.bin} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, codex: { ...prev.codex, bin: e.target.value } }))} placeholder="/Applications/Codex.app/.../codex" /></label>
                      <label>Codex Model<select value={executorSettings.codex.model} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, codex: { ...prev.codex, model: e.target.value } }))}>{providerModelPresets['codex-cli'].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
                      <label>Codex Sandbox<select value={executorSettings.codex.sandbox} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, codex: { ...prev.codex, sandbox: e.target.value as ExecutorSettings['codex']['sandbox'] } }))}><option value="read-only">read-only</option><option value="workspace-write">workspace-write</option><option value="danger-full-access">danger-full-access</option></select></label>
                    </>
                  )}
                  {executorSettings.backend === 'openhands-sdk' && (
                    <>
                      <label>Server URL<input value={executorSettings.openhands.serverUrl} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, openhands: { ...prev.openhands, serverUrl: e.target.value } }))} placeholder="http://localhost:8000" /></label>
                      <label>OpenHands Model<select value={executorSettings.openhands.model} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, openhands: { ...prev.openhands, model: e.target.value } }))}>{providerModelPresets['openhands-sdk'].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
                      <ApiKeyInput 
                        label="Anthropic API Key"
                        value={executorSettings.openhands.apiKeys?.anthropic || ''} 
                        onChange={(val) => setExecutorSettings((prev) => ({ ...prev, openhands: { ...prev.openhands, apiKeys: { ...(prev.openhands.apiKeys || {}), anthropic: val } } }))} 
                        placeholder="sk-ant-..." 
                      />
                      <ApiKeyInput 
                        label="OpenAI API Key"
                        value={executorSettings.openhands.apiKeys?.openai || ''} 
                        onChange={(val) => setExecutorSettings((prev) => ({ ...prev, openhands: { ...prev.openhands, apiKeys: { ...(prev.openhands.apiKeys || {}), openai: val } } }))} 
                        placeholder="sk-..." 
                      />
                      <ApiKeyInput 
                        label="Google API Key"
                        value={executorSettings.openhands.apiKeys?.google || ''} 
                        onChange={(val) => setExecutorSettings((prev) => ({ ...prev, openhands: { ...prev.openhands, apiKeys: { ...(prev.openhands.apiKeys || {}), google: val } } }))} 
                        placeholder="AIza..." 
                      />
                    </>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={saveExecutorSettings}>Save CLI Config</Button>
                </div>

                <hr />
                <h3>Guided CLI Authentication & Health</h3>
                <p className={settingsNoteClass}>Verify CLI availability, auth, and test prompt execution.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={refreshCliStatus}>Refresh CLI Status</Button>
                  {executorSettings.backend === 'claude-cli' && <Button variant="secondary" onClick={() => testCliProvider('claude-cli')}>Test Claude CLI</Button>}
                  {executorSettings.backend === 'codex-cli' && <Button variant="secondary" onClick={() => testCliProvider('codex-cli')}>Test Codex CLI</Button>}
                  {(executorSettings.backend === 'openhands-sdk') && (
                    <>
                      <Button variant="secondary" onClick={checkOpenHandsHealth}>Check Server Health</Button>
                      <Button
                        variant="primary"
                        className={isTestingLlm ? 'loading' : ''}
                        disabled={isTestingLlm}
                        onClick={testLlmConfig}
                      >
                        {isTestingLlm ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                        Test End-to-End LLM
                      </Button>
                    </>
                  )}
                </div>

                {llmTestResult && (
                  <div
                    className={`mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3 ${
                      llmTestResult.success ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      {llmTestResult.success ? (
                        <CheckCircle size={18} color="#10b981" />
                      ) : (
                        <AlertTriangle size={18} color="#ef4444" />
                      )}
                      <span>Result: {llmTestResult.status === 'ok' ? 'Success' : `Failed (${llmTestResult.status})`}</span>
                      <span className="ml-auto text-xs opacity-60">{llmTestResult.latencyMs}ms</span>
                    </div>
                    <div className="text-sm opacity-90">{llmTestResult.message}</div>
                    {llmTestResult.response && (
                      <div className="mt-2.5 rounded border-l-4 border-sky-500 bg-slate-950 p-2.5 font-mono text-xs whitespace-pre-wrap">
                        <strong>Response:</strong> {llmTestResult.response}
                      </div>
                    )}
                  </div>
                )}
                <div className={`${settingsGridClass} mt-3`}>
                  {executorSettings.backend === 'codex-cli' && (
                    <>
                      {runtimeCapabilities.implicitCodexApiKey && (
                        <div className={`${settingsMetaClass} col-span-full mb-2 rounded border border-amber-800 bg-amber-950/40 p-2`}>
                          <span className="font-semibold text-amber-300">Environment Key Bound:</span> Codex is currently using API Key implicitly inherited from your shell environment variables (<code>{runtimeCapabilities.implicitCodexApiKey}</code>).
                          To override it, you can execute a new login below.
                        </div>
                      )}
                      <label>Codex API Key (for `codex login --with-api-key`)<input type="password" value={codexApiKeyForLogin} onChange={(e) => setCodexApiKeyForLogin(e.target.value)} placeholder="sk-..." /></label>
                      <label>Codex Login Action<Button variant="secondary" onClick={loginCodexWithApiKey}>Login Codex via API Key</Button></label>
                    </>
                  )}
                </div>
                {executorSettings.backend === 'claude-cli' && <div className={settingsMetaClass}>Claude login is interactive: run <code>claude setup-token</code> (or <code>claude /login</code>) in terminal, then click Test Claude CLI.</div>}
                <div className={settingsMetaClass}>{cliHealthMessage}</div>
          </section>
        )}
      </main>
    </div>
  );
}
