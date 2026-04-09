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
      const fallback = {
        provider: 'codex-cli',
        model: deps.providerModelCatalog['codex-cli'][0],
      };
      deps.setRuntimeSelection(fallback);
      deps.saveRuntimeState('runtime_selection', fallback);
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
    const raw = deps.settingsStoreGet('executor');
    const executor = (raw && typeof raw === 'object') ? raw as { openhands?: { serverUrl?: string } } : {};
    const configuredUrl = String(executor.openhands?.serverUrl || '').trim();
    const serverUrl = (configuredUrl || process.env.OPENHANDS_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
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

    const raw = deps.settingsStoreGet('executor');
    const executor = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    executor.backend = provider;
    if (provider === 'claude-cli') executor.claude = { ...(executor.claude || {}), model };
    if (provider === 'codex-cli') executor.codex = { ...(executor.codex || {}), model };
    if (provider === 'openhands-sdk') executor.openhands = { ...(executor.openhands || {}), model };
    deps.settingsStoreSet('executor', executor);
    deps.persistSettingsStore();
    deps.syncExecutorSettingsToRuntimeConfig(executor, auth);

    res.json({ success: true, runtimeSelection: nextSelection });
  });

  app.get('/api/cockpit/settings/:section', (req, res) => {
    const auth = deps.getAuthContext(req);
    if (!auth) return res.status(401).json({ success: false, error: 'unauthorized' });

    const section = String(req.params.section || '').trim().toLowerCase();
    if (!WORKSPACE_SETTINGS_SECTIONS.has(section) && section !== 'executor') {
      return res.status(404).json({
        success: false,
        error: 'workspace_settings_section_not_found',
        message: `Section '${section}' is not exposed via workspace settings API`,
      });
    }
    const current = deps.settingsStoreGet(section) || {};
    if (section === 'executor' && current && typeof current === 'object') {
      const cloned = JSON.parse(JSON.stringify(current));
      if (cloned?.openhands?.apiKeys && typeof cloned.openhands.apiKeys === 'object') {
        const masked: Record<string, string> = {};
        for (const provider of Object.keys(cloned.openhands.apiKeys)) masked[provider] = '***';
        cloned.openhands.apiKeys = masked;
      }
      return res.json({ success: true, settings: cloned });
    }

    res.json({
      success: true,
      settings: current,
    });
  });

  app.post('/api/cockpit/settings/:section', (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;

    const section = String(req.params.section || '').trim().toLowerCase();
    if (!WORKSPACE_SETTINGS_SECTIONS.has(section) && section !== 'executor') {
      return res.status(404).json({
        success: false,
        error: 'workspace_settings_section_not_found',
        message: `Section '${section}' is not exposed via workspace settings API`,
      });
    }
    const settings = (req.body && typeof req.body === 'object') ? req.body : {};
    if (section === 'executor' && settings.openhands && typeof settings.openhands === 'object') {
      const providedApiKeys = settings.openhands.apiKeys && typeof settings.openhands.apiKeys === 'object'
        ? settings.openhands.apiKeys
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
      settings.openhands = {
        ...settings.openhands,
        apiKeys: Object.fromEntries(Object.keys(providedApiKeys).map((provider) => [provider, '***'])),
      };
    }

    deps.settingsStoreSet(section, settings);
    deps.persistSettingsStore();

    if (section === 'executor') {
      const runtimeFromSettings = deps.getRuntimeSelectionFromExecutorSettings();
      if (runtimeFromSettings) {
        deps.setRuntimeSelection(runtimeFromSettings);
        deps.saveRuntimeState('runtime_selection', runtimeFromSettings);
      }
      if (settings && typeof settings === 'object') {
        deps.syncExecutorSettingsToRuntimeConfig(settings as Record<string, any>, auth);
      }
    }

    res.json({ success: true, settings });
  });
}
