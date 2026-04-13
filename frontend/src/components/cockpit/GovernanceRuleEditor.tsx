import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Shield, Settings, Info, CheckCircle, Trash2, Cpu, Activity, FileLock } from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceRule } from './governanceTypes';

interface GovernanceRuleEditorProps {
  ruleId: string;
  onClose: () => void;
  onSaved: () => void;
}

const GovernanceRuleEditor: React.FC<GovernanceRuleEditorProps> = ({ ruleId, onClose, onSaved }) => {
  const [rule, setRule] = useState<GovernanceRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRule();
  }, [ruleId]);

  const loadRule = async () => {
    setLoading(true);
    try {
      const allRulesRes = await fetchJsonStrict<{ rules: GovernanceRule[] }>('/governance/rules');
      const found = allRulesRes.rules.find(r => r.id === ruleId);
      if (found) {
        setRule(found);
      } else {
        setError('Rule not found');
      }
    } catch (err) {
      setError('Failed to load rule details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rule) return;
    setSaving(true);
    try {
      await fetch('/api/governance/rules/' + rule.id, {
        method: 'POST', // Backend often expects POST for updates in this project's pattern
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      onSaved();
      onClose();
    } catch (err) {
      setError('Failed to save rule changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-950 shadow-2xl border-l border-slate-800 z-50 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-slate-900 animate-pulse rounded"></div>
          <div className="h-8 w-8 bg-slate-900 animate-pulse rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-slate-900 animate-pulse rounded"></div>
          <div className="h-10 bg-slate-900 animate-pulse rounded"></div>
          <div className="h-10 bg-slate-900 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-950 shadow-2xl border-l border-slate-800 z-50 p-6 flex flex-col">
         <div className="flex items-center justify-between mb-8">
           <h2 className="text-xl font-bold text-white">Error</h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
         </div>
         <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 text-sm">
           {error}
         </div>
      </div>
    );
  }

  if (!rule) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-950 shadow-2xl border-l border-slate-800 z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">Configure Rule</h2>
          </div>
          <code className="text-[10px] text-slate-500 uppercase tracking-widest">{rule.id}</code>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Info Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">{rule.metadata.name}</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed italic">
            "{rule.metadata.description}"
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            <span>Version: <span className="text-slate-300">{rule.metadata.version}</span></span>
            <span>Owner: <span className="text-slate-300">{rule.metadata.owner}</span></span>
          </div>
        </div>

        {/* Risk & Compliance Extension */}
        <section className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Risk & Compliance
          </h4>
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-200 block mb-3">Risk Level</label>
              <div className="flex flex-wrap gap-2">
                {['low', 'medium', 'high', 'critical'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setRule({
                      ...rule,
                      metadata: { ...rule.metadata, riskLevel: level as any }
                    })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all ${
                      rule.metadata.riskLevel === level
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200 block mb-2">Impact Areas</label>
              <div className="flex flex-wrap gap-2">
                {['reliability', 'security', 'cost', 'privacy', 'legal'].map((area) => {
                  const isActive = (rule.metadata.impactArea || []).includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => {
                        const current = rule.metadata.impactArea || [];
                        const next = isActive ? current.filter(a => a !== area) : [...current, area];
                        setRule({
                          ...rule,
                          metadata: { ...rule.metadata, impactArea: next }
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        isActive
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <Activity className="w-3 h-3" />
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200 block mb-2">Compliance Domains</label>
              <div className="flex flex-wrap gap-2">
                {['internal', 'soc2', 'hipaa', 'gdpr', 'pci'].map((domain) => {
                  const isActive = (rule.metadata.complianceDomain || []).includes(domain);
                  return (
                    <button
                      key={domain}
                      onClick={() => {
                        const current = rule.metadata.complianceDomain || [];
                        const next = isActive ? current.filter(d => d !== domain) : [...current, domain];
                        setRule({
                          ...rule,
                          metadata: { ...rule.metadata, complianceDomain: next }
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        isActive
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <FileLock className="w-3 h-3" />
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Global Settings */}
        <section className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            Global Settings
          </h4>

          <div className="space-y-4 bg-slate-900/40 p-5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-200 block">Effectiveness Status</label>
                <span className="text-xs text-slate-500">Enable or disable this rule across all projects by default.</span>
              </div>
              <button
                onClick={() => setRule({ ...rule, is_enabled: !rule.is_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    rule.is_enabled ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <label className="text-sm font-medium text-slate-200 block mb-3">Enforcement Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRule({ ...rule, enforcementMode: 'soft' })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    rule.enforcementMode === 'soft' 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Soft (Advice)</span>
                </button>
                <button
                  onClick={() => setRule({ ...rule, enforcementMode: 'hard' })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    rule.enforcementMode === 'hard' 
                      ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Hard (Block)</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Evaluation Logic */}
        <section className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            Evaluation Logic
          </h4>
          
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
             <div>
                <label className="text-sm font-medium text-slate-200 block mb-1">Evaluation Type</label>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <code className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-blue-400 font-bold">{rule.evaluationType}</code>
                  <span>- Defined by core engine architecture.</span>
                </div>
             </div>

             <div>
                <label className="text-sm font-medium text-slate-200 block mb-2">Trigger Phases</label>
                <div className="flex flex-wrap gap-2">
                  {rule.triggerPhases.map(phase => (
                    <span key={phase} className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 font-bold tracking-widest uppercase">
                      {phase}
                    </span>
                  ))}
                </div>
             </div>
          </div>
        </section>

        {/* Required Evidence */}
        <section className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            Evidence Requirements
          </h4>
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-500 uppercase tracking-tighter decoration-slate-900">
                <tr>
                  <th className="px-4 py-2 border-b border-slate-800 font-bold">Artifact Key</th>
                  <th className="px-4 py-2 border-b border-slate-800 text-right">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rule.evidence.map(key => (
                  <tr key={key} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 font-mono italic">{key}</td>
                    <td className="px-4 py-3 text-right text-slate-500">Mandatory</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-600 px-2 italic text-center">
            Evidence overrides can be configured in the project-level settings tab.
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 font-medium px-4 py-2 rounded-lg hover:bg-red-500/5 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Archive Rule
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-8 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
              saving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
            }`}
          >
            {saving ? <div className="animate-spin h-4 w-4 border-b-2 border-blue-200 rounded-full" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GovernanceRuleEditor;
