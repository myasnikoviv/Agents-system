import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { apiUrl } from '../../lib/http';
import { Button } from '../ui/button';

const SECTIONS = ['general', 'appearance', 'executor', 'usage'] as const;
type SectionId = (typeof SECTIONS)[number];

interface GeneralSettings {
  defaultOpenBehavior: 'finder' | 'editor' | 'terminal';
  language: 'auto' | 'uk' | 'en';
  commandDetail: 'steps' | 'verbose' | 'minimal';
  executionSpeed: 'standard' | 'fast' | 'deep';
}

interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  accent: 'blue' | 'emerald' | 'violet';
  fontScale: 'small' | 'medium' | 'large';
}

interface UsageSettings {
  detailLevel: 'minimal' | 'steps' | 'verbose';
  notifyOnCompletion: boolean;
  showTokenStats: boolean;
}

interface ExecutorSettings {
  provider: 'claude-cli' | 'codex-cli' | 'openhands-sdk';
  model: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

const SETTINGS_KEYS = {
  general: 'cockpit.settings.general.v2',
  appearance: 'cockpit.settings.appearance.v2',
  usage: 'cockpit.settings.usage.v2',
  executor: 'cockpit.settings.executor.v2',
} as const;

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
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100"
      />
    </label>
  );
};

export function CockpitSettingsPage() {
  const navigate = useNavigate();
  const { section } = useParams();
  const currentSection = useMemo<SectionId>(() => {
    const value = (section || 'general') as SectionId;
    return (SECTIONS as readonly string[]).includes(value) ? value : 'general';
  }, [section]);

  const [generalSavedAt, setGeneralSavedAt] = useState('Unsaved');
  const [appearanceSavedAt, setAppearanceSavedAt] = useState('Unsaved');
  const [usageSavedAt, setUsageSavedAt] = useState('Unsaved');
  const [executorSavedAt, setExecutorSavedAt] = useState('Unsaved');

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    defaultOpenBehavior: 'finder',
    language: 'auto',
    commandDetail: 'steps',
    executionSpeed: 'standard',
  });
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    density: 'comfortable',
    accent: 'blue',
    fontScale: 'medium',
  });
  const [usageSettings, setUsageSettings] = useState<UsageSettings>({
    detailLevel: 'steps',
    notifyOnCompletion: true,
    showTokenStats: true,
  });
  const [executorSettings, setExecutorSettings] = useState<ExecutorSettings>({
    provider: 'codex-cli',
    model: 'auto',
    apiKeys: { anthropic: '', openai: '', google: '' },
  });

  useEffect(() => {
    if (!section) navigate('/cockpit/settings/general', { replace: true });
  }, [section, navigate]);

  useEffect(() => {
    const rawGeneral = localStorage.getItem(SETTINGS_KEYS.general);
    const rawAppearance = localStorage.getItem(SETTINGS_KEYS.appearance);
    const rawUsage = localStorage.getItem(SETTINGS_KEYS.usage);
    const rawExecutor = localStorage.getItem(SETTINGS_KEYS.executor);

    if (rawGeneral) {
      try { setGeneralSettings((prev) => ({ ...prev, ...JSON.parse(rawGeneral) })); setGeneralSavedAt('Saved'); } catch {}
    }
    if (rawAppearance) {
      try { setAppearanceSettings((prev) => ({ ...prev, ...JSON.parse(rawAppearance) })); setAppearanceSavedAt('Saved'); } catch {}
    }
    if (rawUsage) {
      try { setUsageSettings((prev) => ({ ...prev, ...JSON.parse(rawUsage) })); setUsageSavedAt('Saved'); } catch {}
    }
    if (rawExecutor) {
      try { setExecutorSettings((prev) => ({ ...prev, ...JSON.parse(rawExecutor) })); setExecutorSavedAt('Saved'); } catch {}
    }
  }, []);

  useEffect(() => {
    const loadGeneralFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/workspace/settings/general'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setGeneralSettings((prev) => ({ ...prev, ...data.settings }));
        setGeneralSavedAt('Saved');
      } catch {}
    };
    void loadGeneralFromApi();
  }, []);

  useEffect(() => {
    const loadAppearanceFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/workspace/settings/appearance'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setAppearanceSettings((prev) => ({ ...prev, ...data.settings }));
        setAppearanceSavedAt('Saved');
      } catch {}
    };
    void loadAppearanceFromApi();
  }, []);

  useEffect(() => {
    const loadUsageFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/workspace/settings/usage'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setUsageSettings((prev) => ({ ...prev, ...data.settings }));
        setUsageSavedAt('Saved');
      } catch {}
    };
    void loadUsageFromApi();
  }, []);

  useEffect(() => {
    const loadExecutorFromApi = async () => {
      try {
        const res = await fetch(apiUrl('/api/workspace/settings/executor'));
        const data = await res.json();
        if (!data.success || !data.settings) return;
        setExecutorSettings((prev) => ({ ...prev, ...data.settings, apiKeys: { ...prev.apiKeys, ...(data.settings.apiKeys || {}) } }));
        setExecutorSavedAt('Saved');
      } catch {}
    };
    void loadExecutorFromApi();
  }, []);

  const saveSection = async (sectionId: 'general' | 'appearance' | 'usage' | 'executor', payload: unknown, onSaved: (savedAt: string) => void) => {
    try {
      const res = await fetch(apiUrl(`/api/workspace/settings/${sectionId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        onSaved(`Save failed at ${new Date().toLocaleTimeString()}`);
        return;
      }
      const next = data.settings || payload;
      if (sectionId === 'general') {
        setGeneralSettings((prev) => ({ ...prev, ...(next as Partial<GeneralSettings>) }));
        localStorage.setItem(SETTINGS_KEYS.general, JSON.stringify(next));
      } else if (sectionId === 'appearance') {
        setAppearanceSettings((prev) => ({ ...prev, ...(next as Partial<AppearanceSettings>) }));
        localStorage.setItem(SETTINGS_KEYS.appearance, JSON.stringify(next));
      } else if (sectionId === 'usage') {
        setUsageSettings((prev) => ({ ...prev, ...(next as Partial<UsageSettings>) }));
        localStorage.setItem(SETTINGS_KEYS.usage, JSON.stringify(next));
      } else {
        setExecutorSettings((prev) => ({ ...prev, ...(next as Partial<ExecutorSettings>), apiKeys: { ...prev.apiKeys, ...((next as Partial<ExecutorSettings>).apiKeys || {}) } }));
        localStorage.setItem(SETTINGS_KEYS.executor, JSON.stringify(next));
      }
      onSaved(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      onSaved(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  };

  const sectionTitle = currentSection.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const settingsCardClass = 'mb-3 rounded-xl border border-slate-700 bg-slate-900 p-3.5';
  const settingsMetaClass = 'mt-2 text-xs text-slate-400';
  const settingsNoteClass = 'mb-3 text-sm text-slate-400';
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
          <p className="mb-0 mt-2 text-sm text-slate-400">Client settings only. Platform controls were moved out of workspace settings.</p>
        </header>

        {currentSection === 'general' && (
          <section className={settingsCardClass}>
            <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-100"><SlidersHorizontal size={16} />Core Defaults</h2>
            <div className={settingsGridClass}>
              <label>Default Open Behavior<select value={generalSettings.defaultOpenBehavior} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, defaultOpenBehavior: e.target.value as GeneralSettings['defaultOpenBehavior'] }))}><option value="finder">Finder</option><option value="editor">Editor</option><option value="terminal">Terminal</option></select></label>
              <label>Language<select value={generalSettings.language} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, language: e.target.value as GeneralSettings['language'] }))}><option value="auto">Auto Detect</option><option value="uk">Ukrainian</option><option value="en">English</option></select></label>
              <label>Command Detail<select value={generalSettings.commandDetail} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, commandDetail: e.target.value as GeneralSettings['commandDetail'] }))}><option value="steps">Code Steps</option><option value="verbose">Verbose Logs</option><option value="minimal">Minimal</option></select></label>
              <label>Execution Speed<select value={generalSettings.executionSpeed} onChange={(e) => setGeneralSettings((prev) => ({ ...prev, executionSpeed: e.target.value as GeneralSettings['executionSpeed'] }))}><option value="standard">Standard</option><option value="fast">Fast</option><option value="deep">Deep Reasoning</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => saveSection('general', generalSettings, setGeneralSavedAt)}>Save General Settings</Button></div>
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
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => saveSection('appearance', appearanceSettings, setAppearanceSavedAt)}>Save Appearance</Button></div>
            <div className={settingsMetaClass}>{appearanceSavedAt}</div>
          </section>
        )}

        {currentSection === 'usage' && (
          <section className={settingsCardClass}>
            <h2>Usage Preferences</h2>
            <div className={settingsGridClass}>
              <label>Detail Level<select value={usageSettings.detailLevel} onChange={(e) => setUsageSettings((prev) => ({ ...prev, detailLevel: e.target.value as UsageSettings['detailLevel'] }))}><option value="minimal">Minimal</option><option value="steps">Steps</option><option value="verbose">Verbose</option></select></label>
              <label>Notify On Completion<select value={String(usageSettings.notifyOnCompletion)} onChange={(e) => setUsageSettings((prev) => ({ ...prev, notifyOnCompletion: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
              <label>Show Token Stats<select value={String(usageSettings.showTokenStats)} onChange={(e) => setUsageSettings((prev) => ({ ...prev, showTokenStats: e.target.value === 'true' }))}><option value="true">On</option><option value="false">Off</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => saveSection('usage', usageSettings, setUsageSavedAt)}>Save Usage</Button></div>
            <div className={settingsMetaClass}>{usageSavedAt}</div>
          </section>
        )}

        {currentSection === 'executor' && (
          <section className={settingsCardClass}>
            <h2><ShieldCheck size={16} />Provider & Executor Configuration</h2>
            <p className={settingsNoteClass}>Client-level provider and model preferences.</p>

            <div className={settingsGridClass}>
              <label>Provider<select value={executorSettings.provider} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, provider: e.target.value as ExecutorSettings['provider'] }))}><option value="claude-cli">Claude Code CLI</option><option value="codex-cli">Codex CLI</option><option value="openhands-sdk">OpenHands SDK</option></select></label>
              <label>Model<input value={executorSettings.model} onChange={(e) => setExecutorSettings((prev) => ({ ...prev, model: e.target.value }))} /></label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <ApiKeyInput label="Anthropic API Key" value={executorSettings.apiKeys.anthropic || ''} onChange={(val) => setExecutorSettings((prev) => ({ ...prev, apiKeys: { ...prev.apiKeys, anthropic: val } }))} />
              <ApiKeyInput label="OpenAI API Key" value={executorSettings.apiKeys.openai || ''} onChange={(val) => setExecutorSettings((prev) => ({ ...prev, apiKeys: { ...prev.apiKeys, openai: val } }))} />
              <ApiKeyInput label="Google API Key" value={executorSettings.apiKeys.google || ''} onChange={(val) => setExecutorSettings((prev) => ({ ...prev, apiKeys: { ...prev.apiKeys, google: val } }))} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => saveSection('executor', executorSettings, setExecutorSavedAt)}>Save Configuration</Button>
            </div>

            <div className={settingsMetaClass}>{executorSavedAt}</div>
          </section>
        )}
      </main>
    </div>
  );
}
