import { useState, useEffect, type FC } from 'react';
import {
  FileText,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Database,
  Cpu,
  GitBranch,
  Lock,
  Key,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
  Shield,
  Loader2,
  Plus
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { ProjectPolicy, GovernanceRule } from './governanceTypes';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

interface ProjectPolicyManagerProps {
  projectId?: string;
}

export const ProjectPolicyManager: FC<ProjectPolicyManagerProps> = ({ projectId = 'default' }) => {
  const [policy, setPolicy] = useState<ProjectPolicy | null>(null);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [policyData, rulesData] = await Promise.all([
        fetchJsonStrict<{ policy: ProjectPolicy }>(`/governance/projects/${projectId}/policy`),
        fetchJsonStrict<{ rules: GovernanceRule[] }>('/governance/rules')
      ]);
      setPolicy(policyData.policy);
      setRules(rulesData.rules || []);
      setMessage(null);
    } catch (err) {
      console.error('Failed to load project policy:', err);
      setMessage({ type: 'error', text: 'Failed to load governance policy' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    setMessage(null);
    try {
      await fetchJsonStrict(`/governance/projects/${projectId}/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      setMessage({ type: 'success', text: 'Project policy updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save project policy' });
    } finally {
      setSaving(false);
    }
  };

  const toggleExecutionProfile = () => {
    if (!policy) return;
    const nextProfile = policy.executionProfile === 'engineering' ? 'non_engineering' : 'engineering';

    // Auto-update git policy defaults when switching profile
    const gitDefaults = nextProfile === 'engineering'
      ? {
        enforceMainBranchProtection: true,
        requirePreflightToken: true,
        requireWorktreeIsolation: true,
        allowGitMutations: true,
      }
      : {
        enforceMainBranchProtection: false,
        requirePreflightToken: false,
        requireWorktreeIsolation: false,
        allowGitMutations: false,
      };

    setPolicy({
      ...policy,
      executionProfile: nextProfile,
      gitPolicy: gitDefaults
    });
  };

  const toggleGitPolicy = (key: keyof ProjectPolicy['gitPolicy']) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      gitPolicy: {
        ...policy.gitPolicy,
        [key]: !policy.gitPolicy[key]
      }
    });
  };

  const addOverride = (ruleId: string) => {
    if (!policy) return;
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newOverrides = { ...policy.ruleOverrides };
    newOverrides[ruleId] = {
      evidence: [...rule.evidence],
      thresholds: rule.thresholds ? { ...rule.thresholds } : {}
    };
    setPolicy({ ...policy, ruleOverrides: newOverrides });
  };

  const removeOverride = (ruleId: string) => {
    if (!policy) return;
    const newOverrides = { ...policy.ruleOverrides };
    delete newOverrides[ruleId];
    setPolicy({ ...policy, ruleOverrides: newOverrides });
  };

  const toggleRuleState = (ruleId: string) => {
    if (!policy) return;

    const isExplicitlyEnabled = policy.enabledRules.includes(ruleId);
    const isExplicitlyDisabled = policy.disabledRules.includes(ruleId);

    let nextEnabled = [...policy.enabledRules];
    let nextDisabled = [...policy.disabledRules];

    if (isExplicitlyDisabled) {
      nextDisabled = nextDisabled.filter(id => id !== ruleId);
      nextEnabled = [...new Set([...nextEnabled, ruleId])];
    } else if (isExplicitlyEnabled) {
      nextEnabled = nextEnabled.filter(id => id !== ruleId);
      nextDisabled = [...new Set([...nextDisabled, ruleId])];
    } else {
      const isDefaultEnabled = policy.defaultEnabledRules.includes(ruleId);
      if (isDefaultEnabled) {
        nextDisabled = [...nextDisabled, ruleId];
      } else {
        nextEnabled = [...nextEnabled, ruleId];
      }
    }

    setPolicy({
      ...policy,
      enabledRules: nextEnabled,
      disabledRules: nextDisabled
    });
  };

  if (loading || !policy) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-secondary/10 rounded-xl border border-dashed border-border/50">
        <Loader2 className="animate-spin text-primary/50 mb-3" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Synchronizing Governance Stack...</span>
      </div>
    );
  }

  const activeOverrides = Object.keys(policy.ruleOverrides);
  const availableRulesForOverride = rules.filter(r => !activeOverrides.includes(r.id));
  const sublabelClass = "text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1 mb-4";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Policy Header */}
      <Card className="border-border/50 bg-secondary/5 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20 shadow-lg shadow-primary/10">
              <Lock className="size-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Project Governance Policy</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Active Context:</span>
                <Badge variant="secondary" className="font-mono text-[10px] font-bold uppercase tracking-widest h-5 px-2">
                  {projectId}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {message && (
              <Badge
                variant={message.type === 'success' ? "outline" : "destructive"}
                className={`flex items-center gap-2 h-9 px-4 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-right-4 ${message.type === 'success' ? 'border-emerald-500/30 text-emerald-500' : ''}`}
              >
                {message.type === 'success' ? <CheckCircle className="size-4" /> : <AlertCircle className="size-4" />}
                {message.text}
              </Badge>
            )}
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-8 h-12 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              {saving ? <Loader2 className="animate-spin size-4 mr-2" /> : <Save className="size-4 mr-2" />}
              {saving ? 'Synchronizing...' : 'Commit Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Core Configuration */}
        <div className="space-y-8">
          {/* Execution Profile */}
          <section className="space-y-4">
            <h3 className={sublabelClass}>
              <Cpu className="size-4" />
              Runtime Execution Profile
            </h3>
            <Card className="border-border/50 bg-secondary/5 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {policy.executionProfile === 'engineering' ? 'Software Engineering Mode' : 'Operational / Non-Engineering'}
                    <Badge variant={policy.executionProfile === 'engineering' ? 'default' : 'secondary'} className="text-[8px] h-4">
                      {policy.executionProfile.toUpperCase()}
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
                    {policy.executionProfile === 'engineering'
                      ? 'Optimized for version-controlled development with strict Git Flow and preflight validation.'
                      : 'Lightweight governance for content, data, or administrative tasks without code-level constraints.'}
                  </p>
                </div>
                <div className="flex bg-background/50 p-1 rounded-full border border-border shadow-inner">
                  <button
                    onClick={toggleExecutionProfile}
                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${policy.executionProfile === 'engineering' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Engineering
                  </button>
                  <button
                    onClick={toggleExecutionProfile}
                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${policy.executionProfile === 'non_engineering' ? 'bg-secondary text-secondary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Ops
                  </button>
                </div>
              </div>
            </Card>
          </section>

          {/* Git Policy */}
          <section className="space-y-4">
            <h3 className={sublabelClass}>
              <GitBranch className="size-4" />
              Automated Git Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enforceMainBranchProtection', label: 'Main Protection', icon: Lock, desc: 'Block direct pushes to main' },
                { key: 'requirePreflightToken', label: 'Preflight Tokens', icon: Key, desc: 'Mandatory atomic task ID' },
                { key: 'requireWorktreeIsolation', label: 'Worktree Isolation', icon: Layers, desc: 'Isolated filesystem per task' },
                { key: 'allowGitMutations', label: 'Allow Mutations', icon: Wrench, desc: 'Permit agent branch operations' },
              ].map((item) => {
                const isActive = policy.gitPolicy[item.key as keyof typeof policy.gitPolicy];
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleGitPolicy(item.key as any)}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 group relative overflow-hidden text-balance ${isActive
                        ? 'bg-primary/5 border-primary/50 shadow-lg shadow-primary/5 translate-y-[-2px]'
                        : 'bg-secondary/5 border-border hover:border-muted-foreground/30 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-background text-muted-foreground'}`}>
                        <item.icon className="size-4" />
                      </div>
                      <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                        {isActive && <CheckCircle className="size-3" />}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground uppercase tracking-tight">{item.label}</h5>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Rule Overrides & Toggles */}
        <div className="space-y-8">
          {/* Rule Dashboard (Quick Toggles) */}
          <section className="space-y-4">
            <h3 className={sublabelClass}>
              <Shield className="size-4" />
              Governance Rule Configuration
            </h3>
            <Card className="border-border/50 bg-secondary/5 overflow-hidden shadow-sm divide-y divide-border/20">
              {rules.map(rule => {
                const isExplicitlyEnabled = policy.enabledRules.includes(rule.id);
                const isExplicitlyDisabled = policy.disabledRules.includes(rule.id);
                const isDefaultEnabled = policy.defaultEnabledRules.includes(rule.id);
                const isActive = isExplicitlyEnabled || (isDefaultEnabled && !isExplicitlyDisabled);
                const isOverridden = isExplicitlyEnabled || isExplicitlyDisabled;

                return (
                  <div key={rule.id} className="p-4 flex items-center justify-between gap-4 hover:bg-background/40 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                        <Shield className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{rule.metadata.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-500/80' : 'text-muted-foreground'}`}>
                            {isActive ? 'Active' : 'Standby'}
                          </span>
                          {isOverridden && (
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest text-primary border-primary/30 h-3.5 px-1 bg-primary/5">Deviated</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRuleState(rule.id)}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      {isActive ? <ToggleRight className="size-8 text-primary" /> : <ToggleLeft className="size-8 text-muted-foreground" />}
                    </button>
                  </div>
                );
              })}
            </Card>
          </section>

          {/* Evidence Configuration */}
          <section className="space-y-4">
            <h3 className={sublabelClass}>
              <Database className="size-4" />
              Active Evidence Mapping
            </h3>
            <Card className="border-border/50 bg-secondary/5 p-6 shadow-sm">
              {activeOverrides.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic mb-6">No custom evidence patterns defined for this context.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {availableRulesForOverride.slice(0, 3).map(rule => (
                      <Button
                        key={rule.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addOverride(rule.id)}
                        className="text-[9px] font-black uppercase tracking-widest h-7 border-dashed border-border hover:border-primary/50"
                      >
                        <Plus className="size-3 mr-1.5" /> {rule.metadata.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeOverrides.map(ruleId => {
                    const rule = rules.find(r => r.id === ruleId);
                    const override = policy.ruleOverrides[ruleId];
                    if (!rule) return null;
                    return (
                      <div key={ruleId} className="space-y-3 bg-background/50 p-4 rounded-xl border border-border/50 relative group hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest">{rule.metadata.name}</h5>
                            <code className="text-[9px] text-muted-foreground font-mono opacity-50">{ruleId}</code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOverride(ruleId)}
                            className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(override.evidence || []).map((pattern, idx) => (
                            <div key={idx} className="relative group/input">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                              <Input
                                value={pattern}
                                onChange={(e) => {
                                  const nextEvidence = [...(override.evidence || [])];
                                  nextEvidence[idx] = e.target.value;
                                  setPolicy({
                                    ...policy,
                                    ruleOverrides: {
                                      ...policy.ruleOverrides,
                                      [ruleId]: { ...override, evidence: nextEvidence }
                                    }
                                  });
                                }}
                                className="pl-8 h-8 bg-background border-border/50 text-[10px] font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-border/20">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addOverride(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-background border border-dashed border-border rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:outline-none hover:border-primary/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">+ Add custom evidence override...</option>
                      {availableRulesForOverride.map(rule => (
                        <option key={rule.id} value={rule.id}>{rule.metadata.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProjectPolicyManager;
