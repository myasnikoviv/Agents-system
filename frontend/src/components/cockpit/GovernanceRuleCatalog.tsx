import React, { useState, useEffect } from 'react';
import { Search, Shield, AlertTriangle, Cpu, CheckCircle, Info, Settings, Activity, FileLock } from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceRule } from './governanceTypes';

interface GovernanceRuleCatalogProps {
  onEditRule?: (ruleId: string) => void;
  onRefresh?: () => void;
}

const GovernanceRuleCatalog: React.FC<GovernanceRuleCatalogProps> = ({ onEditRule }) => {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchJsonStrict<{ rules: GovernanceRule[] }>('/governance/rules');
      setRules(data.rules || []);
    } catch (err) {
      console.error('Failed to load governance rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || rule.evaluationType === filterType;
    const matchesMode = filterMode === 'all' || rule.enforcementMode === filterMode;

    return matchesSearch && matchesType && matchesMode;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deterministic': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'heuristic': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'agentic': return <Cpu className="w-4 h-4 text-amber-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search rules by name, ID, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('deterministic')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'deterministic' ? 'bg-blue-900/50 text-blue-200 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Deterministic
            </button>
            <button
              onClick={() => setFilterType('agentic')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'agentic' ? 'bg-amber-900/50 text-amber-200 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Agentic
            </button>
          </div>

          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterMode === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All Modes
            </button>
            <button
              onClick={() => setFilterMode('hard')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterMode === 'hard' ? 'bg-red-900/50 text-red-200 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Hard
            </button>
            <button
              onClick={() => setFilterMode('soft')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterMode === 'soft' ? 'bg-emerald-900/50 text-emerald-200 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Soft
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-slate-500 font-medium">Loading rule registry...</span>
          </div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Search className="w-8 h-8 opacity-20" />
            <p>No rules match your current filters</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredRules.map(rule => (
            <div 
              key={rule.id}
              className="group relative bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${rule.enforcementMode === 'hard' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {rule.enforcementMode === 'hard' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">{rule.metadata.name}</h3>
                    <code className="text-[10px] text-slate-600 uppercase tracking-wider">{rule.id}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-tighter ${
                    rule.is_enabled ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {rule.is_enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
                {rule.metadata.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-[11px] text-slate-300">
                  {getTypeIcon(rule.evaluationType)}
                  <span className="capitalize">{rule.evaluationType}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-[11px] text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>v{rule.metadata.version}</span>
                </div>
                {rule.metadata.riskLevel && (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold uppercase tracking-tight ${getRiskColor(rule.metadata.riskLevel)}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{rule.metadata.riskLevel}</span>
                  </div>
                )}
                {(rule.metadata.impactArea || []).map(area => (
                  <div key={area} className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/5 text-purple-400 border border-purple-500/10 text-[10px] font-medium">
                    <Activity className="w-3 h-3" />
                    <span>{area}</span>
                  </div>
                ))}
                {(rule.metadata.complianceDomain || []).map(domain => (
                  <div key={domain} className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/5 text-blue-400 border border-blue-500/10 text-[10px] font-medium">
                    <FileLock className="w-3 h-3" />
                    <span>{domain}</span>
                  </div>
                ))}
                {rule.triggerPhases.map(phase => (
                  <div key={phase} className="px-2 py-1 rounded-md bg-blue-500/5 text-blue-500/50 border border-blue-500/10 text-[10px] uppercase font-bold tracking-tight">
                    {phase}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 mt-auto">
                <div className="flex -space-x-1.5">
                  {(rule.metadata.tags || []).slice(0, 3).map(tag => (
                    <div key={tag} className="px-2 py-0.5 text-[9px] bg-slate-950 border border-slate-800 rounded-full text-slate-500">
                      #{tag}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => onEditRule?.(rule.id)}
                  className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-slate-600"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GovernanceRuleCatalog;
