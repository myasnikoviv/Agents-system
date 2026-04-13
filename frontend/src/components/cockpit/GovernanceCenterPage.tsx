import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Shield, 
  Database, 
  Table, 
  Activity, 
  RefreshCcw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { fetchJsonSafe } from '../../lib/http';
import GovernanceRuleCatalog from './GovernanceRuleCatalog';
import GovernanceRuleEditor from './GovernanceRuleEditor';
import ProjectPolicyManager from './ProjectPolicyManager';
import { ManualOverrideManager } from './ManualOverrideManager';
import { GovernanceAuditTrail } from './GovernanceAuditTrail';

export function GovernanceCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'catalog';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    projectOverrides: 0,
    pendingManual: 0
  });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [rulesRes, overridesRes] = await Promise.all([
        fetchJsonSafe<any>('/api/governance/rules'),
        fetchJsonSafe<any>('/api/governance/overrides')
      ]);
      
      const rules = Array.isArray(rulesRes?.rules) ? rulesRes.rules : [];
      const overrides = Array.isArray(overridesRes?.overrides) ? overridesRes.overrides : [];
      
      setStats({
        totalRules: rules.length,
        activeRules: rules.filter((r: any) => r.is_enabled !== false).length,
        projectOverrides: overrides.length,
        pendingManual: 0
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const tabs = [
    { id: 'catalog', label: 'Rule Catalog', icon: Table },
    { id: 'policy', label: 'Project Policy', icon: Database },
    { id: 'manual', label: 'Manual Overrides', icon: Shield },
    { id: 'audit', label: 'Audit Trail', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-slate-300">
      {/* Top Navigation */}
      <div className="border-b border-slate-800 bg-[#0f1115]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all" 
              to="/cockpit/runtime"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <Shield className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Governance Cockpit</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => void loadStats()}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-2 text-sm"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Engine Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Managed Rules', value: stats.totalRules, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Active Policies', value: stats.activeRules, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Project Overrides', value: stats.projectOverrides, icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Pending Approvals', value: stats.pendingManual, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
          ].map((stat, i) => (
            <div key={i} className="bg-[#0f1115] border border-slate-800 rounded-2xl p-5 shadow-sm group hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Real-time</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#0f1115] p-1.5 rounded-2xl border border-slate-800 mb-8 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'catalog' && (
            <GovernanceRuleCatalog 
              onEditRule={(id) => setEditingRuleId(id)} 
              onRefresh={loadStats}
            />
          )}
          
          {activeTab === 'policy' && (
            <ProjectPolicyManager projectId="default" />
          )}

          {activeTab === 'manual' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              <ManualOverrideManager />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              <GovernanceAuditTrail />
            </div>
          )}
        </div>
      </div>

      {/* Rule Editor Overlay */}
      {editingRuleId && (
        <GovernanceRuleEditor 
          ruleId={editingRuleId}
          onClose={() => setEditingRuleId(null)}
          onSaved={() => {
            void loadStats();
            setEditingRuleId(null);
          }}
        />
      )}
    </div>
  );
}
