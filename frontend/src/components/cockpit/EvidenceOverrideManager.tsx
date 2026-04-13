import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Save, AlertCircle, CheckCircle, Database, LayoutGrid } from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { ProjectPolicy, GovernanceRule } from './governanceTypes';

interface EvidenceOverrideManagerProps {
  projectId?: string;
}

const EvidenceOverrideManager: React.FC<EvidenceOverrideManagerProps> = ({ projectId = 'default' }) => {
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
      console.error('Failed to load policy or rules:', err);
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
      setMessage({ type: 'success', text: 'Policy overrides saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save policy changes' });
    } finally {
      setSaving(false);
    }
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

  const updateEvidence = (ruleId: string, index: number, value: string) => {
    if (!policy || !policy.ruleOverrides[ruleId]) return;
    const newEvidence = [...(policy.ruleOverrides[ruleId].evidence || [])];
    newEvidence[index] = value;
    
    setPolicy({
      ...policy,
      ruleOverrides: {
        ...policy.ruleOverrides,
        [ruleId]: { ...policy.ruleOverrides[ruleId], evidence: newEvidence }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-slate-500 font-medium">Loading project policy...</span>
        </div>
      </div>
    );
  }

  if (!policy) return null;

  const activeOverrides = Object.keys(policy.ruleOverrides);
  const availableRules = rules.filter(r => !activeOverrides.includes(r.id));

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Evidence Overrides</h2>
            <p className="text-sm text-slate-500">Configure project-specific file patterns for rule compliance.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
              saving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {saving ? <div className="animate-spin h-3.5 w-3.5 border-b-2 border-blue-200 rounded-full" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Overrides */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
            <FileText className="w-3.5 h-3.5" />
            Active Project Overrides
          </h3>
          
          {activeOverrides.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-slate-900/20 rounded-xl border border-dashed border-slate-800 text-slate-600 text-sm italic">
              No active overrides for this project. Use the catalog on the right to add one.
            </div>
          ) : (
            <div className="space-y-4">
              {activeOverrides.map(ruleId => {
                const rule = rules.find(r => r.id === ruleId);
                const override = policy.ruleOverrides[ruleId];
                if (!rule) return null;

                return (
                  <div key={ruleId} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4 hover:bg-slate-900/60 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400">
                          < ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-200">{rule.metadata.name}</h4>
                          <code className="text-[10px] text-slate-600 uppercase tracking-wider">{ruleId}</code>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeOverride(ruleId)}
                        className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 pt-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-tight block">Evidence File Patterns</label>
                       <div className="grid grid-cols-1 gap-2">
                         {(override.evidence || []).map((pattern, idx) => (
                           <div key={idx} className="flex items-center gap-2">
                             <div className="flex-1 relative">
                               <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                               <input
                                 type="text"
                                 value={pattern}
                                 onChange={(e) => updateEvidence(ruleId, idx, e.target.value)}
                                 placeholder="e.g. tests/report.xml"
                                 className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                               />
                             </div>
                           </div>
                         ))}
                       </div>
                       <p className="text-[10px] text-slate-600 italic">
                         The rule will look for these files to extract compliance evidence.
                       </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Rules Sidebar */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
            <LayoutGrid className="w-3.5 h-3.5" />
            Add Override
          </h3>
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/50">
            {availableRules.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-600 italic">
                All rules already have project-level overrides.
              </div>
            ) : (
              availableRules.map(rule => (
                <div key={rule.id} className="p-4 hover:bg-slate-900/50 transition-colors group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">{rule.metadata.name}</p>
                      <p className="text-[10px] text-slate-600 truncate mt-0.5">{rule.metadata.description}</p>
                    </div>
                    <button 
                      onClick={() => addOverride(rule.id)}
                      className="p-1.5 bg-slate-900 hover:bg-blue-600 text-slate-500 hover:text-white rounded border border-slate-700 hover:border-blue-500 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for shield check icon if not imported correctly
const ShieldCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export default EvidenceOverrideManager;
