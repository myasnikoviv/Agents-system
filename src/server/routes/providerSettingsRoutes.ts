import type express from 'express';

interface ProviderSettingsRouteDeps {
  requireRole: (req: express.Request, res: express.Response, role?: 'member' | 'admin') => any;
  getAuthContext: (req: express.Request) => { userId: string; role: 'member' | 'admin'; tenantId: string; workspaceId: string } | null;
  getRuntimeSelectionFromExecutorSettings: () => { provider: string; model: string } | null;
  isRuntimeProvider: (provider: string) => boolean;
  providerModelCatalog: Record<string, string[]>;
  getRuntimeSelection: () => { provider: string; model: string };
  setRuntimeSelection: (value: { provider: string; model: string }) => void;
  saveRuntimeState: (key: string, value: unknown) => void;
  settingsStoreGet: (section: string) => any;
  settingsStoreSet: (section: string, value: unknown) => void;
  persistSettingsStore: () => void;
  syncExecutorSettingsToRuntimeConfig: (
    executor: Record<string, any>,
    auth: { userId: string; role: 'member' | 'admin'; tenantId: string; workspaceId: string },
  ) => void;
  secretsStoreUpsert: (input: {
    tenantId: string;
    workspaceId: string;
    key: string;
    value: string;
    createdBy: string;
  }) => void;
  getRuntimeEnforcementByProject: () => Record<string, { pipeline?: string; skills?: string[] }>;
  setRuntimeEnforcementByProject: (next: Record<string, { pipeline?: string; skills?: string[] }>) => void;
  getRuntimeFooter: () => Record<string, any>;
  setRuntimeFooter: (next: Record<string, any>) => void;
  runExternalExecutor: (input: {
    executor: 'claude-code' | 'codex-cli' | 'openhands-sdk';
    prompt: string;
    cwd: string;
    model?: string;
    timeoutMs: number;
  }) => Promise<{
    ok: boolean;
    exitCode: number;
    durationMs: number;
    stdout: string;
    stderr: string;
    command: string[];
  }>;
}

export function registerProviderSettingsRoutes(app: express.Express, deps: ProviderSettingsRouteDeps): void {
  const WORKSPACE_SETTINGS_SECTIONS = new Set(['general', 'appearance', 'usage', 'configuration']);
  type WorkspaceConfiguration = {
    provider: 'claude-cli' | 'codex-cli' | 'openhands-sdk';
    model: string;
    apiKeys: Record<string, string>;
  };
  const normalizeWorkspaceSection = (sectionRaw: string): string => {
    const section = sectionRaw.trim().toLowerCase();
    return section === 'configuration' ? 'executor' : section;
  };
  const normalizeWorkspaceConfiguration = (raw: unknown): WorkspaceConfiguration => {
    const currentRuntime = deps.getRuntimeSelection();
    const source = (raw && typeof raw === 'object') ? (raw as Record<string, any>) : {};
    const providerCandidate =
      String(source.provider || source.backend || currentRuntime.provider || 'codex-cli').trim();
    const provider: WorkspaceConfiguration['provider'] =
      providerCandidate === 'claude-cli' || providerCandidate === 'openhands-sdk' || providerCandidate === 'codex-cli'
        ? providerCandidate
        : 'codex-cli';
    const model = String(
      source.model ||
        source?.[provider === 'claude-cli' ? 'claude' : provider === 'codex-cli' ? 'codex' : 'openhands']?.model ||
        currentRuntime.model ||
        '',
    ).trim() || currentRuntime.model;
    const apiKeysSource = source.apiKeys && typeof source.apiKeys === 'object'
      ? source.apiKeys as Record<string, any>
      : source?.openhands?.apiKeys && typeof source.openhands.apiKeys === 'object'
        ? source.openhands.apiKeys as Record<string, any>
        : {};
    const apiKeys = Object.fromEntries(
      Object.entries(apiKeysSource).map(([k, v]) => [String(k), String(v ?? '')]),
    );
    return { provider, model, apiKeys };
  };

  app.get('/api/cockpit/runtime/enforcement', (req, res) => {
    const projectId = String(req.query?.projectId || '').trim();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required' });
      return;
    }
    const profile = deps.getRuntimeEnforcementByProject()[projectId] || {};
    res.json({ success: true, projectId, profile });
  });

  app.post('/api/cockpit/runtime/enforcement', (req, res) => {
    if (!deps.requireRole(req, res, 'admin')) return;
    const projectId = String(req.body?.projectId || '').trim();
    if (!projectId) {
      res.status(400).json({ success: false, error: 'project_id_required' });
      return;
    }
    const pipeline = String(req.body?.pipeline || '').trim();
    const skills = Array.isArray(req.body?.skills)
      ? req.body.skills.map((s: any) => String(s || '').trim()).filter(Boolean)
      : [];

    const next = {
      ...deps.getRuntimeEnforcementByProject(),
      [projectId]: {
        ...(pipeline ? { pipeline } : {}),
        ...(skills.length > 0 ? { skills: Array.from(new Set(skills)) } : {}),
      },
    };

    deps.setRuntimeEnforcementByProject(next);
    deps.saveRuntimeState('runtime_enforcement_by_project', next);
    res.json({ success: true, projectId, profile: next[projectId] });
  });

  app.get('/api/cockpit/providers', (_req, res) => {
    const runtimeFromSettings = deps.getRuntimeSelectionFromExecutorSettings();
    if (runtimeFromSettings) {
      deps.setRuntimeSelection(runtimeFromSettings);
      deps.saveRuntimeState('runtime_selection', runtimeFromSettings);
    } else if (!deps.isRuntimeProvider(deps.getRuntimeSelection().provider)) {
      const defaultValue = {
        provider: 'codex-cli',
        model: deps.providerModelCatalog['codex-cli'][0],
      };
      deps.setRuntimeSelection(defaultValue);
      deps.saveRuntimeState('runtime_selection', defaultValue);
    }

    res.json({
      success: true,
      runtimeSelection: deps.getRuntimeSelection(),
      capabilities: {
        providers: Object.keys(deps.providerModelCatalog),
        providerModels: deps.providerModelCatalog,
        executionTargets: ['local'],
        accessPolicies: ['full-access', 'sandbox'],
      },
    });
  });

  app.get('/api/cockpit/runtime-footer', (_req, res) => {
    res.json({
      success: true,
      runtimeFooter: deps.getRuntimeFooter(),
    });
  });

  app.post('/api/cockpit/runtime-footer', (req, res) => {
    if (!deps.requireRole(req, res, 'admin')) return;
    const patch = req.body || {};
    const next = {
      ...deps.getRuntimeFooter(),
      ...patch,
    };
    deps.setRuntimeFooter(next);
    deps.saveRuntimeState('runtime_footer', next);
    res.json({ success: true, runtimeFooter: next });
  });

  app.get('/api/cockpit/providers/openhands/health', (_req, res) => {
    const serverUrl = String(process.env.OPENHANDS_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    fetch(`${serverUrl}/health`)
      .then(async (response) => {
        if (!response.ok) {
          res.json({ success: true, alive: false, error: `HTTP ${response.status}`, serverUrl });
          return;
        }
        const data = await response.json().catch(() => ({}));
        res.json({ success: true, alive: true, serverUrl, details: data });
      })
      .catch((error) => {
        res.json({ success: true, alive: false, error: error?.message || 'unreachable', serverUrl });
      });
  });

  app.get('/api/cockpit/providers/cli/status', (_req, res) => {
    res.json({
      success: true,
      status: {
        codex: { loggedIn: false },
        claude: { loggedIn: false, needsLogin: true },
      },
    });
  });

  app.post('/api/cockpit/providers/cli/test', (req, res) => {
    const provider = String(req.body?.provider || 'unknown');
    res.json({
      success: false,
      error: `${provider} test is unavailable in standalone backend mode`,
      result: { stdout: '', stderr: 'not_implemented' },
    });
  });

  app.post('/api/cockpit/providers/cli/login', (_req, res) => {
    res.json({ success: false, error: 'CLI login is not implemented in standalone backend mode' });
  });

  app.post('/api/cockpit/providers/test-message', async (req, res) => {
    if (!deps.requireRole(req, res, 'member')) return;
    const runtimeSelection = deps.getRuntimeSelection();
    const provider = String(req.body?.provider || runtimeSelection.provider || 'codex-cli').trim();
    const model = String(req.body?.model || runtimeSelection.model || '').trim();
    const prompt = String(
      req.body?.prompt ||
      'Health-check prompt. Reply with exactly: LLM_TEST_OK',
    ).trim();

    const executor: 'claude-code' | 'codex-cli' | 'openhands-sdk' =
      provider === 'claude-cli'
        ? 'claude-code'
        : provider === 'openhands-sdk'
          ? 'openhands-sdk'
          : 'codex-cli';

    try {
      const result = await deps.runExternalExecutor({
        executor,
        prompt,
        cwd: process.cwd(),
        model: model || undefined,
        timeoutMs: Number(process.env.COCKPIT_PROVIDER_TEST_TIMEOUT_MS || 45000),
      });

      const output = String(result.stdout || '').trim();
      const error = String(result.stderr || '').trim();
      res.json({
        success: result.ok,
        status: result.ok ? 'ok' : 'failed',
        provider,
        model: model || null,
        message: result.ok ? 'LLM test completed' : (error || 'Provider test failed'),
        result: {
          ok: result.ok,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          stdout: output.slice(0, 1200),
          stderr: error.slice(0, 1200),
          command: result.command,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        status: 'failed',
        provider,
        model: model || null,
        message: error?.message || 'Provider test execution failed',
        result: {
          ok: false,
          exitCode: -1,
          durationMs: 0,
          stdout: '',
          stderr: String(error?.message || error || 'unknown_error'),
          command: [],
        },
      });
    }
  });

  app.post('/api/cockpit/providers/select', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const current = deps.getRuntimeSelection();
    const requestedProvider = String(req.body?.provider || current.provider);
    const model = String(req.body?.model || current.model);
    const provider = deps.isRuntimeProvider(requestedProvider) ? requestedProvider : 'codex-cli';
    const nextSelection = { provider, model };
    deps.setRuntimeSelection(nextSelection);
    deps.saveRuntimeState('runtime_selection', nextSelection);

    const currentConfig = normalizeWorkspaceConfiguration(deps.settingsStoreGet('executor'));
    const nextConfig: WorkspaceConfiguration = { ...currentConfig, provider, model };
    deps.settingsStoreSet('executor', nextConfig);
    deps.persistSettingsStore();
    deps.syncExecutorSettingsToRuntimeConfig({
      backend: provider,
      [provider === 'claude-cli' ? 'claude' : provider === 'codex-cli' ? 'codex' : 'openhands']: { model },
    }, auth);

    res.json({ success: true, runtimeSelection: nextSelection });
  });

  app.get('/api/workspace/settings/:section', (req, res) => {
    const auth = deps.getAuthContext(req);
    if (!auth) return res.status(401).json({ success: false, error: 'unauthorized' });

    const section = normalizeWorkspaceSection(String(req.params.section || ''));
    if (!WORKSPACE_SETTINGS_SECTIONS.has(section) && section !== 'executor') {
      return res.status(404).json({
        success: false,
        error: 'workspace_settings_section_not_found',
        message: `Section '${section}' is not exposed via workspace settings API`,
      });
    }
    const current = deps.settingsStoreGet(section) || {};
    if (section === 'executor') {
      const normalized = normalizeWorkspaceConfiguration(current);
      const masked: Record<string, string> = {};
      for (const provider of Object.keys(normalized.apiKeys || {})) masked[provider] = '***';
      return res.json({
        success: true,
        settings: {
          provider: normalized.provider,
          model: normalized.model,
          apiKeys: masked,
        },
      });
    }

    res.json({
      success: true,
      settings: current,
    });
  });

  app.post('/api/workspace/settings/:section', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    const section = normalizeWorkspaceSection(String(req.params.section || ''));
    if (!WORKSPACE_SETTINGS_SECTIONS.has(section) && section !== 'executor') {
      return res.status(404).json({
        success: false,
        error: 'workspace_settings_section_not_found',
        message: `Section '${section}' is not exposed via workspace settings API`,
      });
    }
    const settings = (req.body && typeof req.body === 'object') ? req.body : {};
    if (section === 'executor') {
      const normalized = normalizeWorkspaceConfiguration(settings);
      const providedApiKeys = normalized.apiKeys && typeof normalized.apiKeys === 'object'
        ? normalized.apiKeys
        : {};
      for (const [provider, rawKey] of Object.entries(providedApiKeys)) {
        const value = String(rawKey || '').trim();
        if (!value) continue;
        deps.secretsStoreUpsert({
          tenantId: auth.tenantId,
          workspaceId: auth.workspaceId,
          key: `openhands.apiKeys.${provider}`,
          value,
          createdBy: auth.userId,
        });
      }
      const masked = Object.fromEntries(Object.keys(providedApiKeys).map((provider) => [provider, '***']));
      const sanitized: WorkspaceConfiguration = {
        provider: normalized.provider,
        model: normalized.model,
        apiKeys: masked,
      };
      deps.settingsStoreSet(section, sanitized);
      deps.persistSettingsStore();

      deps.setRuntimeSelection({ provider: normalized.provider, model: normalized.model });
      deps.saveRuntimeState('runtime_selection', { provider: normalized.provider, model: normalized.model });
      deps.syncExecutorSettingsToRuntimeConfig({
        backend: normalized.provider,
        [normalized.provider === 'claude-cli' ? 'claude' : normalized.provider === 'codex-cli' ? 'codex' : 'openhands']: {
          model: normalized.model,
        },
      }, auth);
      return res.json({ success: true, settings: sanitized });
    }

    deps.settingsStoreSet(section, settings);
    deps.persistSettingsStore();

    res.json({ success: true, settings });
  });
}
