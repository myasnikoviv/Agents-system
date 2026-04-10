import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { fetchJsonSafe, fetchJsonStrict } from '../../lib/http';

type RuleItem = { id: string; metadata?: { name?: string }; disabled?: boolean; effectiveEnabled?: boolean };
type LoopItem = { id: string; kind: string; disabled?: boolean };
type ProfileItem = { projectId: string; executionProfile: string; gitPolicy?: Record<string, boolean> };
type OverrideItem = { id: string; projectId: string; scope: string; enabled: boolean };
type ArtifactItem = { category: string; relativePath: string; exists: boolean };

export function GovernanceCenterPage() {
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState('');
  const [error, setError] = useState('');
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loops, setLoops] = useState<LoopItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rulesRes, loopsRes, profilesRes, overridesRes, artifactsRes] = await Promise.all([
        fetchJsonSafe<any>('/api/governance/rules?projectId=default'),
        fetchJsonSafe<any>('/api/governance/loops'),
        fetchJsonSafe<any>('/api/governance/profiles?projectId=default'),
        fetchJsonSafe<any>('/api/governance/overrides'),
        fetchJsonSafe<any>('/api/governance/artifacts'),
      ]);
      setRules(Array.isArray(rulesRes?.rules) ? rulesRes.rules : []);
      setLoops(Array.isArray(loopsRes?.loops) ? loopsRes.loops : []);
      setProfiles(Array.isArray(profilesRes?.profiles) ? profilesRes.profiles : []);
      setOverrides(Array.isArray(overridesRes?.overrides) ? overridesRes.overrides : []);
      setArtifacts(Array.isArray(artifactsRes?.artifacts) ? artifactsRes.artifacts : []);
    } catch (e: any) {
      setError(String(e?.message || 'Failed to load governance center'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRule = async (rule: RuleItem) => {
    const nextDisabled = rule.effectiveEnabled;
    setMutatingId(`rule:${rule.id}`);
    setError('');
    try {
      await fetchJsonStrict(`/api/governance/rules/${encodeURIComponent(rule.id)}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      await load();
    } catch (e: any) {
      setError(String(e?.message || 'Failed to update rule'));
    } finally {
      setMutatingId('');
    }
  };

  const toggleLoop = async (loop: LoopItem) => {
    const nextDisabled = !loop.disabled;
    setMutatingId(`loop:${loop.id}`);
    setError('');
    try {
      await fetchJsonStrict(`/api/governance/loops/${encodeURIComponent(loop.id)}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      await load();
    } catch (e: any) {
      setError(String(e?.message || 'Failed to update loop'));
    } finally {
      setMutatingId('');
    }
  };

  const card = 'rounded-xl border border-slate-700 bg-slate-900 p-3';

  return (
    <div className="min-h-screen bg-[#121315] px-4 py-5 text-slate-200 lg:px-6">
      <div className="mx-auto w-full max-w-[1160px]">
        <Link className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 no-underline transition-colors hover:text-slate-100" to="/cockpit/runtime">
          <ChevronLeft size={16} />
          Back To Cockpit
        </Link>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="m-0 inline-flex items-center gap-2 text-3xl font-semibold text-slate-100">
            <ShieldCheck size={22} />
            Governance Center
          </h1>
          <button type="button" className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-100" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        {error && <div className="mb-3 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-sm text-red-200">{error}</div>}
        {loading ? (
          <div className="text-sm text-slate-400">Loading governance data...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className={card}>
              <h2 className="mb-2 text-sm font-semibold text-slate-100">Rules ({rules.length})</h2>
              <div className="space-y-1 text-xs text-slate-300">
                {rules.slice(0, 12).map((row) => (
                  <div key={row.id} className="flex items-center justify-between">
                    <span>{row.metadata?.name || row.id}</span>
                    <div className="flex items-center gap-2">
                      <span>{row.effectiveEnabled ? 'enabled' : row.disabled ? 'disabled' : 'inactive'}</span>
                      <button
                        type="button"
                        className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100"
                        disabled={mutatingId === `rule:${row.id}`}
                        onClick={() => void toggleRule(row)}
                      >
                        {row.effectiveEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className={card}>
              <h2 className="mb-2 text-sm font-semibold text-slate-100">Loops ({loops.length})</h2>
              <div className="space-y-1 text-xs text-slate-300">
                {loops.slice(0, 12).map((row) => (
                  <div key={row.id} className="flex items-center justify-between">
                    <span>{row.id}</span>
                    <div className="flex items-center gap-2">
                      <span>{row.disabled ? 'disabled' : row.kind}</span>
                      <button
                        type="button"
                        className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100"
                        disabled={mutatingId === `loop:${row.id}`}
                        onClick={() => void toggleLoop(row)}
                      >
                        {row.disabled ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className={card}>
              <h2 className="mb-2 text-sm font-semibold text-slate-100">Profiles ({profiles.length})</h2>
              <div className="space-y-1 text-xs text-slate-300">
                {profiles.slice(0, 12).map((row) => (
                  <div key={row.projectId} className="flex items-center justify-between">
                    <span>{row.projectId}</span>
                    <span>{row.executionProfile}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={card}>
              <h2 className="mb-2 text-sm font-semibold text-slate-100">Overrides ({overrides.length})</h2>
              <div className="space-y-1 text-xs text-slate-300">
                {overrides.slice(0, 12).map((row) => (
                  <div key={row.id} className="flex items-center justify-between">
                    <span>{row.scope} · {row.projectId}</span>
                    <span>{row.enabled ? 'enabled' : 'disabled'}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={`${card} lg:col-span-2`}>
              <h2 className="mb-2 text-sm font-semibold text-slate-100">Artifacts ({artifacts.length})</h2>
              <div className="grid grid-cols-1 gap-1 text-xs text-slate-300 md:grid-cols-2">
                {artifacts.map((row) => (
                  <div key={`${row.category}:${row.relativePath}`} className="flex items-center justify-between">
                    <span>{row.category} · {row.relativePath}</span>
                    <span>{row.exists ? 'present' : 'missing'}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
