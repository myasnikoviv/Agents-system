import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Tag, 
  Briefcase,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceManualOverride } from './governanceTypes';

export const ManualOverrideManager: React.FC = () => {
  const [overrides, setOverrides] = useState<GovernanceManualOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [newOverride, setNewOverride] = useState<{
    projectId: string;
    scope: 'global' | 'phase' | 'rule';
    reason: string;
    ruleId: string;
    expiresAt: string;
  }>({
    projectId: 'global',
    scope: 'global',
    reason: '',
    ruleId: '',
    expiresAt: '',
  });

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const data = await fetchJsonStrict<{ overrides: GovernanceManualOverride[] }>('/api/governance/overrides');
      setOverrides(data.overrides);
      setError(null);
    } catch (err) {
      setError('Failed to load overrides');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOverride.reason) return;

    try {
      await fetchJsonStrict('/api/governance/overrides', {
        method: 'POST',
        body: JSON.stringify({
          ...newOverride,
          projectId: newOverride.projectId === 'global' ? '*' : newOverride.projectId,
        }),
      });
      setIsCreating(false);
      setNewOverride({ projectId: 'global', scope: 'global', reason: '', ruleId: '', expiresAt: '' });
      fetchOverrides();
    } catch (err) {
      alert('Failed to create override');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Manual Overrides</h2>
          <p className="text-sm text-gray-400 text-balance">
            Emergency bypasses for governance rules. Use with caution.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-lg shadow-rose-900/20"
        >
          {isCreating ? 'Cancel' : (
            <>
              <Plus size={18} />
              New Override
            </>
          )}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-gray-800/50 border border-rose-500/30 rounded-xl p-6 space-y-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Project ID</label>
              <input
                type="text"
                placeholder="Specific Project or 'global'"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none"
                value={newOverride.projectId}
                onChange={e => setNewOverride({ ...newOverride, projectId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Scope</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none"
                value={newOverride.scope}
                onChange={e => setNewOverride({ ...newOverride, scope: e.target.value as any })}
              >
                <option value="global">Global (Full Bypass)</option>
                <option value="phase">Phase Level</option>
                <option value="rule">Specific Rule</option>
              </select>
            </div>
            {newOverride.scope === 'rule' && (
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rule ID</label>
                <input
                  type="text"
                  placeholder="e.g. AG-004-TESTS"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none"
                  value={newOverride.ruleId}
                  onChange={e => setNewOverride({ ...newOverride, ruleId: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Justification (Required)</label>
              <textarea
                placeholder="Why is this override necessary?"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none h-24 resize-none"
                value={newOverride.reason}
                onChange={e => setNewOverride({ ...newOverride, reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Expiration (Optional)</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none"
                value={newOverride.expiresAt}
                onChange={e => setNewOverride({ ...newOverride, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Apply Emergency Override
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
          <Loader2 className="animate-spin text-rose-500" size={32} />
          <p>Syncing override registry...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="mx-auto text-rose-500" size={40} />
          <p className="text-rose-200">{error}</p>
        </div>
      ) : overrides.length === 0 ? (
        <div className="bg-gray-800/20 border border-dashed border-gray-700 rounded-xl p-20 text-center space-y-4">
          <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="text-emerald-500" size={32} />
          </div>
          <div>
            <h3 className="text-white font-medium">No Active Overrides</h3>
            <p className="text-gray-400 text-sm mt-1">System is running in full compliance mode.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {overrides.map((override) => (
            <div 
              key={override.id}
              className="bg-gray-800/40 border border-gray-700 hover:border-gray-600 rounded-xl p-5 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${override.enabled ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-700 text-gray-400'}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {override.scope.toUpperCase()} BYPASS
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {override.projectId === '*' ? 'GLOBAL' : override.projectId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{override.id}</p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-gray-300 text-sm leading-relaxed italic border-l-2 border-gray-700 pl-4 py-1">
                  "{override.reason}"
                </p>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <User size={14} className="text-gray-600" />
                    <span>Actor: <span className="text-gray-300">{override.actorId}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={14} className="text-gray-600" />
                    <span>Created: <span className="text-gray-300">{new Date(override.createdAt).toLocaleDateString()}</span></span>
                  </div>
                  {override.expiresAt && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                      <Tag size={14} className="text-amber-600" />
                      <span>Expires: <span className="font-medium text-amber-200">{new Date(override.expiresAt).toLocaleString()}</span></span>
                    </div>
                  )}
                  {override.ruleId && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400/80">
                      <Briefcase size={14} className="text-blue-600" />
                      <span>Rule: <span className="font-medium text-blue-200">{override.ruleId}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
