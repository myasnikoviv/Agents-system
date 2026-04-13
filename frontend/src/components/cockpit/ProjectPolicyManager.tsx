import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  LayoutGrid, 
  Cpu, 
  Github, 
  Lock, 
  Key, 
  Layers, 
  Wrench,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { ProjectPolicy, GovernanceRule } from './governanceTypes';

interface ProjectPolicyManagerProps {
  projectId?: string;
}

const ProjectPolicyManager: React.FC<ProjectPolicyManagerProps> = ({ projectId = 'default' }) => {
  const [policy, setPolicy] = useState<ProjectPolicy | null>(null);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [policyData, rulesData] = await Promise.all([
        fetchJsonStrict<{ policy: ProjectPolicy }>(`/governance/projects/${projectId}/policy`),
        fetchJsonStrict<{ rules: GovernanceRule[] }>('/governance/rules')
      ]);
      setPolicy(policyData.policy);
      setRules(rulesData.rules || []);
    } catch (err) {
      console.error('Failed to load project policy:', err);
      setMessage({ type: 'error', text: 'Failed to load governance policy' });
    } finally {
      setLoading(false);
    }
  };

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
      // Move from disabled to enabled
      nextDisabled = nextDisabled.filter(id => id !== ruleId);
      nextEnabled = [...new Set([...nextEnabled, ruleId])];
    } else if (isExplicitlyEnabled) {
      // Move from enabled to disabled
      nextEnabled = nextEnabled.filter(id => id !== ruleId);
      nextDisabled = [...new Set([...nextDisabled, ruleId])];
    } else {
      // Check if it was neutral (using default)
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
      <div className="flex items-center justify-center h-64 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const activeOverrides = Object.keys(policy.ruleOverrides);
  const availableRulesForOverride = rules.filter(r => !activeOverrides.includes(r.id));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Policy Header */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Project Governance Policy</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">Active Project:</span>
              <code className="text-[11px] font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-widest">{projectId}</code>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {message && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-right-4 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl ${
              saving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {saving ? <div className="animate-spin h-4 w-4 border-b-2 border-white/50 rounded-full" /> : <Save className="w-4 h-4" />}
            {saving ? 'Synchronizing...' : 'Commit Policy Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Core Configuration */}
        <div className="space-y-8">
          {/* Execution Profile */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Cpu className="w-4 h-4" />
              Runtime Execution Profile
            </h3>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-200">
                    {policy.executionProfile === 'engineering' ? 'Software Engineering Mode' : 'Operational / Non-Engineering'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
                    {policy.executionProfile === 'engineering' 
                      ? 'Optimized for version-controlled development with strict Git Flow and preflight validation.'
                      : 'Lightweight governance for content, data, or administrative tasks without code-level constraints.'}
                  </p>
                </div>
                <button 
                  onClick={toggleExecutionProfile}
                  className="flex items-center gap-2 p-1 bg-slate-950 rounded-full border border-slate-800 transition-all hover:border-slate-700"
                >
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${policy.executionProfile === 'engineering' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Engineering</div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${policy.executionProfile === 'non_engineering' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500'}`}>Ops</div>
                </button>
              </div>
            </div>
          </section>

          {/* Git Policy */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Github className="w-4 h-4" />
              Automated Git Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enforceMainBranchProtection', label: 'Main Protection', icon: Lock, desc: 'Block direct pushes to main' },
                { key: 'requirePreflightToken', label: 'Preflight Tokens', icon: Key, desc: 'Mandatory atomic task ID' },
                { key: 'requireWorktreeIsolation', label: 'Worktree Isolation', icon: Layers, desc: 'Isolated filesystem per task' },
                { key: 'allowGitMutations', label: 'Allow Mutations', icon: Wrench, desc: 'Permit agent branch operations' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => toggleGitPolicy(item.key as any)}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 group relative overflow-hidden ${
                    policy.gitPolicy[item.key as keyof typeof policy.gitPolicy]
                      ? 'bg-slate-900/60 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                      : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${policy.gitPolicy[item.key as keyof typeof policy.gitPolicy] ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-900 text-slate-600'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    {policy.gitPolicy[item.key as keyof typeof policy.gitPolicy] ? (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-slate-800" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-200">{item.label}</h5>
                    <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Rule Overrides & Toggles */}
        <div className="space-y-8">
           {/* Rule Dashboard (Quick Toggles) */}
           <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Shield className="w-4 h-4" />
              Project-Level Rule Overrides
            </h3>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
              {rules.map(rule => {
                const isExplicitlyEnabled = policy.enabledRules.includes(rule.id);
                const isExplicitlyDisabled = policy.disabledRules.includes(rule.id);
                const isDefaultEnabled = policy.defaultEnabledRules.includes(rule.id);
                const isActive = isExplicitlyEnabled || (isDefaultEnabled && !isExplicitlyDisabled);
                const isOverridden = isExplicitlyEnabled || isExplicitlyDisabled;

                return (
                  <div key={rule.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-950 text-slate-700'}`}>
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{rule.metadata.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-tight px-1 rounded ${isActive ? 'text-emerald-500/70' : 'text-slate-600'}`}>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                          {isOverridden && (
                            <span className="text-[9px] font-bold uppercase tracking-tight text-blue-400 bg-blue-500/10 px-1 rounded">Deviated</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleRuleState(rule.id)}
                      className="text-slate-600 hover:text-white transition-colors"
                    >
                      {isActive ? <ToggleRight className="w-8 h-8 text-blue-500" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Evidence Configuration (Inherited from EvidenceOverrideManager) */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Database className="w-4 h-4" />
              Custom Evidence Mapping
            </h3>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              {activeOverrides.length === 0 ? (
                <div className="text-center py-10">
                   <p className="text-sm text-slate-500 italic mb-4">No custom patterns configured.</p>
                   <div className="flex flex-wrap gap-2 justify-center">
                     {availableRulesForOverride.slice(0, 3).map(rule => (
                       <button 
                         key={rule.id}
                         onClick={() => addOverride(rule.id)}
                         className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all font-bold uppercase"
                       >
                         + {rule.metadata.name}
                       </button>
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
                       <div key={ruleId} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 relative group">
                         <div className="flex items-center justify-between">
                           <h5 className="text-xs font-bold text-slate-300">{rule.metadata.name}</h5>
                           <button 
                            onClick={() => removeOverride(ruleId)}
                            className="p-1 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded transition-all"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </div>
                         <div className="space-y-2">
                           {(override.evidence || []).map((pattern, idx) => (
                             <div key={idx} className="relative">
                               <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                               <input
                                 type="text"
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
                                 className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                               />
                             </div>
                           ))}
                         </div>
                       </div>
                     );
                   })}
                   <div className="pt-2 border-t border-slate-800">
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            addOverride(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-500 focus:outline-none hover:border-slate-700 transition-all"
                      >
                         <option value="">+ Add custom evidence override...</option>
                         {availableRulesForOverride.map(rule => (
                           <option key={rule.id} value={rule.id}>{rule.metadata.name}</option>
                         ))}
                      </select>
                   </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// Local Shield icon for fallback
const Shield = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default ProjectPolicyManager;
