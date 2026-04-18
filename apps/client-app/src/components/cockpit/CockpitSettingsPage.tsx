import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, SlidersHorizontal, Palette, Activity, Cpu, Save, History, Globe, Zap, Settings2 } from 'lucide-react';
import { apiUrl } from '../../lib/http';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { PageShell } from '../ui/page-shell';

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

const ApiKeyInput: FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
        {label}
      </label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background/50 font-mono text-xs"
      />
    </div>
  );
};

export const CockpitSettingsPage: FC = () => {
  const navigate = useNavigate();
  const { section } = useParams();

  const currentSection = useMemo<SectionId>(() => {
    const value = (section || 'general') as SectionId;
    return (SECTIONS as readonly string[]).includes(value) ? value : 'general';
  }, [section]);

  const [saving, setSaving] = useState(false);
  const [generalSavedAt, setGeneralSavedAt] = useState<string | null>(null);
  const [appearanceSavedAt, setAppearanceSavedAt] = useState<string | null>(null);
  const [usageSavedAt, setUsageSavedAt] = useState<string | null>(null);
  const [executorSavedAt, setExecutorSavedAt] = useState<string | null>(null);

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

    if (rawGeneral) try { setGeneralSettings(v => ({ ...v, ...JSON.parse(rawGeneral) })); } catch { }
    if (rawAppearance) try { setAppearanceSettings(v => ({ ...v, ...JSON.parse(rawAppearance) })); } catch { }
    if (rawUsage) try { setUsageSettings(v => ({ ...v, ...JSON.parse(rawUsage) })); } catch { }
    if (rawExecutor) try { setExecutorSettings(v => ({ ...v, ...JSON.parse(rawExecutor) })); } catch { }
  }, []);

  const loadAll = async () => {
    try {
      const endpoints = ['general', 'appearance', 'usage', 'executor'];
      const results = await Promise.all(
        endpoints.map(e => fetch(apiUrl(`/api/workspace/settings/${e}`)).then(r => r.json()))
      );

      results.forEach((data, i) => {
        if (!data.success || !data.settings) return;
        const e = endpoints[i];
        if (e === 'general') setGeneralSettings(v => ({ ...v, ...data.settings }));
        if (e === 'appearance') setAppearanceSettings(v => ({ ...v, ...data.settings }));
        if (e === 'usage') setUsageSettings(v => ({ ...v, ...data.settings }));
        if (e === 'executor') setExecutorSettings(v => ({ ...v, ...data.settings, apiKeys: { ...v.apiKeys, ...(data.settings.apiKeys || {}) } }));
      });
    } catch (err) {
      console.error('Failed to load settings from API', err);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const saveSection = async (sectionId: SectionId, payload: unknown, updateSavedAt: (val: string) => void) => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/workspace/settings/${sectionId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      const next = data.settings || payload;
      localStorage.setItem(SETTINGS_KEYS[sectionId], JSON.stringify(next));
      updateSavedAt(`Synced at ${new Date().toLocaleTimeString()}`);
    } catch {
      updateSavedAt(`Saved locally at ${new Date().toLocaleTimeString()}`);
    } finally {
      setSaving(false);
    }
  };

  const renderSectionHeader = (title: string, Icon: typeof SlidersHorizontal, subtitle: string) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="size-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );

  const settingLabelClass = "text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2 px-1";
  const settingSelectClass = "w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none";

  return (
    <PageShell title="Settings" mode="client">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Tabs value={currentSection} onValueChange={(val) => navigate(`/cockpit/settings/${val}`)}>
            <TabsList className="bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="general" className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">General</TabsTrigger>
              <TabsTrigger value="appearance" className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Appearance</TabsTrigger>
              <TabsTrigger value="executor" className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Executor</TabsTrigger>
              <TabsTrigger value="usage" className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Usage</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-6">
          {currentSection === 'general' && (
            <Card className="border-border/50 bg-secondary/10 overflow-hidden">
              <CardContent className="p-6">
                {renderSectionHeader("Core Defaults", SlidersHorizontal, "Base configuration for navigation and core behavior.")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={settingLabelClass}>Open Behavior</label>
                    <select
                      className={settingSelectClass}
                      value={generalSettings.defaultOpenBehavior}
                      onChange={(e) => setGeneralSettings(v => ({ ...v, defaultOpenBehavior: e.target.value as any }))}
                    >
                      <option value="finder">Finder</option>
                      <option value="editor">Editor</option>
                      <option value="terminal">Terminal</option>
                    </select>
                  </div>
                  <div>
                    <label className={settingLabelClass}>System Language</label>
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-lg p-1">
                      {['auto', 'uk', 'en'].map(lang => (
                        <Button
                          key={lang}
                          variant={generalSettings.language === lang ? 'default' : 'ghost'}
                          size="sm"
                          className="flex-1 text-[10px] font-bold uppercase"
                          onClick={() => setGeneralSettings(v => ({ ...v, language: lang as any }))}
                        >
                          {lang === 'auto' ? <Globe size={12} className="mr-1.5" /> : null}
                          {lang}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={settingLabelClass}>Command Detail</label>
                    <select
                      className={settingSelectClass}
                      value={generalSettings.commandDetail}
                      onChange={(e) => setGeneralSettings(v => ({ ...v, commandDetail: e.target.value as any }))}
                    >
                      <option value="steps">Steps (Default)</option>
                      <option value="verbose">Verbose Logs</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                  <div>
                    <label className={settingLabelClass}>Execution Speed</label>
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-lg p-1">
                      <Button
                        variant={generalSettings.executionSpeed === 'fast' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 text-[10px] font-bold uppercase"
                        onClick={() => setGeneralSettings(v => ({ ...v, executionSpeed: 'fast' }))}
                      >
                        <Zap size={12} className="mr-1.5" /> Fast
                      </Button>
                      <Button
                        variant={generalSettings.executionSpeed === 'standard' ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 text-[10px] font-bold uppercase"
                        onClick={() => setGeneralSettings(v => ({ ...v, executionSpeed: 'standard' }))}
                      >
                        Standard
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
                  {generalSavedAt && <span className="text-[10px] text-muted-foreground italic">{generalSavedAt}</span>}
                  <Button
                    size="sm"
                    className="px-8 font-black text-xs uppercase shadow-xl shadow-primary/20 ml-auto"
                    onClick={() => saveSection('general', generalSettings, setGeneralSavedAt)}
                    disabled={saving}
                  >
                    <Save size={14} className="mr-2" /> Commit General Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 'appearance' && (
            <Card className="border-border/50 bg-secondary/10 overflow-hidden">
              <CardContent className="p-6">
                {renderSectionHeader("Appearance", Palette, "Visual configuration, theming and layout density.")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={settingLabelClass}>Interface Theme</label>
                    <div className="flex items-center gap-2 bg-background border border-border/50 rounded-lg p-1">
                      {['dark', 'light', 'system'].map(t => (
                        <Button
                          key={t}
                          variant={appearanceSettings.theme === t ? 'default' : 'ghost'}
                          size="sm"
                          className="flex-1 text-[10px] font-bold uppercase"
                          onClick={() => setAppearanceSettings(v => ({ ...v, theme: t as any }))}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={settingLabelClass}>Density Mode</label>
                    <select
                      className={settingSelectClass}
                      value={appearanceSettings.density}
                      onChange={(e) => setAppearanceSettings(v => ({ ...v, density: e.target.value as any }))}
                    >
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="spacious">Spacious</option>
                    </select>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
                  {appearanceSavedAt && <span className="text-[10px] text-muted-foreground italic">{appearanceSavedAt}</span>}
                  <Button
                    size="sm"
                    className="px-8 font-black text-xs uppercase shadow-xl shadow-primary/20 ml-auto"
                    onClick={() => saveSection('appearance', appearanceSettings, setAppearanceSavedAt)}
                    disabled={saving}
                  >
                    <Save size={14} className="mr-2" /> Sync Appearance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 'usage' && (
            <Card className="border-border/50 bg-secondary/10 overflow-hidden">
              <CardContent className="p-6">
                {renderSectionHeader("Usage Preferences", Activity, "Analytics, notifications and detail levels.")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={settingLabelClass}>Token Statistics</label>
                    <Button
                      variant={usageSettings.showTokenStats ? 'secondary' : 'outline'}
                      className="w-full text-[10px] font-black uppercase h-10 italic"
                      onClick={() => setUsageSettings(v => ({ ...v, showTokenStats: !v.showTokenStats }))}
                    >
                      {usageSettings.showTokenStats ? "Visible (Standard)" : "Hidden"}
                    </Button>
                  </div>
                  <div>
                    <label className={settingLabelClass}>Desktop Notifications</label>
                    <Button
                      variant={usageSettings.notifyOnCompletion ? 'default' : 'outline'}
                      className="w-full text-[10px] font-black uppercase h-10"
                      onClick={() => setUsageSettings(v => ({ ...v, notifyOnCompletion: !v.notifyOnCompletion }))}
                    >
                      {usageSettings.notifyOnCompletion ? "Active" : "Silenced"}
                    </Button>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
                  {usageSavedAt && <span className="text-[10px] text-muted-foreground italic">{usageSavedAt}</span>}
                  <Button
                    size="sm"
                    className="px-8 font-black text-xs uppercase shadow-xl shadow-primary/20 ml-auto"
                    onClick={() => saveSection('usage', usageSettings, setUsageSavedAt)}
                    disabled={saving}
                  >
                    <Save size={14} className="mr-2" /> Store Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentSection === 'executor' && (
            <Card className="border-border/50 bg-secondary/10 overflow-hidden">
              <CardContent className="p-6">
                {renderSectionHeader("Provider & Logic", Cpu, "LLM providers, engine selection and authentication keys.")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className={settingLabelClass}>Core Provider</label>
                    <select
                      className={settingSelectClass}
                      value={executorSettings.provider}
                      onChange={(e) => setExecutorSettings(v => ({ ...v, provider: e.target.value as any }))}
                    >
                      <option value="claude-cli">Claude Code CLI</option>
                      <option value="codex-cli">Codex CLI</option>
                      <option value="openhands-sdk">OpenHands SDK</option>
                    </select>
                  </div>
                  <div>
                    <label className={settingLabelClass}>Primary Model Override</label>
                    <Input
                      value={executorSettings.model}
                      onChange={(e) => setExecutorSettings(v => ({ ...v, model: e.target.value }))}
                      className="bg-background/50 border-border/50"
                      placeholder="auto"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/30">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mb-4">
                    <ShieldCheck size={12} /> Authentication Vault
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ApiKeyInput label="Anthropic Key" value={executorSettings.apiKeys.anthropic || ''} onChange={(val) => setExecutorSettings(v => ({ ...v, apiKeys: { ...v.apiKeys, anthropic: val } }))} />
                    <ApiKeyInput label="OpenAI Key" value={executorSettings.apiKeys.openai || ''} onChange={(val) => setExecutorSettings(v => ({ ...v, apiKeys: { ...v.apiKeys, openai: val } }))} />
                    <ApiKeyInput label="Google Key" value={executorSettings.apiKeys.google || ''} onChange={(val) => setExecutorSettings(v => ({ ...v, apiKeys: { ...v.apiKeys, google: val } }))} />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={12} className="text-muted-foreground" />
                    {executorSavedAt && <span className="text-[10px] text-muted-foreground italic">{executorSavedAt}</span>}
                  </div>
                  <Button
                    size="sm"
                    className="px-8 font-black text-xs uppercase shadow-xl shadow-primary/20 ml-auto"
                    onClick={() => saveSection('executor', executorSettings, setExecutorSavedAt)}
                    disabled={saving}
                  >
                    <Save size={14} className="mr-2" /> Deploy Provider Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-12 p-6 border border-primary/10 bg-primary/5 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Settings2 className="size-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-bold mb-1">Advanced Manifest Controls</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platform-level controls and cluster-specific overrides are managed in the <span className="font-bold text-foreground">Infrastructure Control Plane</span>.
                These settings only affect your local session and agent executor profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default CockpitSettingsPage;
