import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  ChevronDown,
  Loader2,
  RefreshCw,
  Zap,
  RotateCcw,
  ShieldAlert,
  Activity,
  Layers,
  Target
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceLogEntry, GovernanceAction, GovernanceStatus } from './governanceTypes';

interface ParsedMetadata {
  [key: string]: string;
}

const parseDetailMetadata = (detail?: string): ParsedMetadata => {
  if (!detail) return {};
  const parts = detail.split(';');
  const meta: ParsedMetadata = {};
  parts.forEach(p => {
    const [key, ...valParts] = p.split(':');
    if (key && valParts.length > 0) {
      meta[key.trim()] = valParts.join(':').trim();
    }
  });
  return meta;
};

const MetadataBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const getIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'tokens': return <Zap size={10} />;
      case 'runid': return <Activity size={10} />;
      case 'chainid': return <Layers size={10} />;
      case 'ticket': return <Target size={10} />;
      case 'retries': return <RotateCcw size={10} />;
      case 'reason': return <AlertTriangle size={10} />;
      default: return null;
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px]">
      <span className="text-gray-500 flex items-center gap-1">
        {getIcon(label)}
        {label}:
      </span>
      <span className="text-gray-300 font-mono">{value}</span>
    </div>
  );
};

export const GovernanceAuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupByRun, setGroupByRun] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchJsonStrict<{ logs: GovernanceLogEntry[] }>('/api/governance/logs');
      setLogs(data.logs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()));
      setError(null);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = useMemo(() => {
    if (logs.length === 0) return { total: 0, blockRate: 0, recoveryRate: 0, warnings: 0 };
    const total = logs.length;
    const blocks = logs.filter(l => l.action === 'block' || l.action === 'escalate').length;
    const warnings = logs.filter(l => l.action === 'warn').length;
    const retries = logs.filter(l => l.action === 'retry').length;
    const passesAfterRetry = logs.filter(l => l.status === 'pass' && l.rule.includes('retry')).length; // Heuristic
    
    return {
      total,
      blockRate: Math.round((blocks / total) * 100),
      warnings,
      recoveryRate: retries > 0 ? Math.round((passesAfterRetry / retries) * 100) : 100
    };
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.rule.toLowerCase().includes(search.toLowerCase()) || 
                          log.detail?.toLowerCase().includes(search.toLowerCase()) ||
                          log.ticket?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedLogs = useMemo(() => {
    if (!groupByRun) return [{ id: 'all', items: filteredLogs }];
    const groups: Record<string, GovernanceLogEntry[]> = {};
    filteredLogs.forEach(log => {
      const gId = log.runId || 'global';
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(log);
    });
    return Object.entries(groups).map(([id, items]) => ({ id, items }));
  }, [filteredLogs, groupByRun]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'fail': return <XCircle size={16} className="text-rose-500" />;
      case 'skip': return <Info size={16} className="text-gray-400" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'block': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'escalate': return 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse';
      case 'warn': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'retry': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'allow': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-800/50 text-gray-400 border-gray-700/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total Checks</div>
            <div className="text-xl font-semibold text-white">{stats.total}</div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Block Rate</div>
            <div className="text-xl font-semibold text-white">{stats.blockRate}%</div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Warnings</div>
            <div className="text-xl font-semibold text-white">{stats.warnings}</div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RotateCcw size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Recovery Rate</div>
            <div className="text-xl font-semibold text-white">{stats.recoveryRate}%</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/50">
        <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search audit trail..."
              className="w-full bg-black/40 border border-gray-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-gray-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setGroupByRun(!groupByRun)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${groupByRun ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-gray-800/30 border-gray-700/50 text-gray-500 hover:text-gray-300'}`}
            >
              <Layers size={14} />
              Group by Run
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
            <select
              className="bg-black/40 border border-gray-800 rounded-lg pl-7 pr-8 py-1.5 text-xs text-gray-400 focus:border-blue-500/50 outline-none appearance-none cursor-pointer hover:bg-black/60 transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="pass">Passed</option>
              <option value="fail">Failed</option>
              <option value="skip">Skipped</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={12} />
          </div>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-600 space-y-4">
          <Loader2 className="animate-spin text-blue-500/50" size={40} />
          <p className="text-sm font-medium tracking-tight uppercase opacity-50">Ingesting Audit Trail...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-12 text-center">
          <AlertTriangle className="mx-auto text-rose-500 mb-4 opacity-50" size={48} />
          <h3 className="text-white font-semibold mb-1">Audit Stream Interrupted</h3>
          <p className="text-rose-400/70 text-sm max-w-xs mx-auto">{error}</p>
        </div>
      ) : groupedLogs.length === 0 ? (
        <div className="bg-gray-900/20 border border-dashed border-gray-800 rounded-2xl p-24 text-center">
          <History size={48} className="mx-auto mb-6 text-gray-800" />
          <h3 className="text-gray-400 font-medium tracking-tight">No Events Recorded</h3>
          <p className="text-gray-600 text-xs mt-1">Refine your search parameters or check global filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((group) => (
            <div key={group.id} className="space-y-4">
              {groupByRun && (
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 whitespace-nowrap">
                    <Activity size={12} />
                    Run: <span className="text-gray-400 font-mono tracking-normal">{group.id === 'global' ? 'System Global' : group.id}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-800 via-gray-800 to-transparent" />
                </div>
              )}
              
              <div className="grid gap-3">
                {group.items.map((log, idx) => {
                  const metadata = parseDetailMetadata(log.detail);
                  return (
                    <div key={`${log.ts}-${idx}`} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 transition-all duration-500 rounded-2xl" />
                      
                      <div className="relative bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 group-hover:border-gray-700 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`mt-0.5 p-1.5 rounded-lg border ${log.status === 'pass' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : log.status === 'fail' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                              {getStatusIcon(log.status)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className="font-semibold text-gray-200 tracking-tight">{log.rule}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${getActionStyles(log.action)}`}>
                                  {log.action}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-gray-600" />
                                  {new Date(log.ts).toLocaleTimeString()}
                                </div>
                                {log.ticket && (
                                  <div className="flex items-center gap-1.5">
                                    <Target size={12} className="text-blue-600/50" />
                                    <span className="text-blue-400/70 font-mono font-bold">{log.ticket}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap md:justify-end gap-2 max-w-full md:max-w-[40%]">
                            {Object.entries(metadata).map(([key, val]) => (
                                <MetadataBadge key={key} label={key} value={val} />
                            ))}
                          </div>
                        </div>
                        
                        {log.detail && (
                          <div className="mt-4 pt-4 border-t border-gray-800/50">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                              <Info size={10} />
                              Verification Insights
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 border border-white/5 font-mono text-[11px] leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors">
                              {log.detail}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
