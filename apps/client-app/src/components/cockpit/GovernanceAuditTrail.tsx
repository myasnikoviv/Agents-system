import { useState, useEffect, useMemo, type FC } from 'react';
import {
  History,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Zap,
  RotateCcw,
  ShieldAlert,
  Activity,
  Layers,
  Target
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceLogEntry } from './governanceTypes';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

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

const MetadataBadge: FC<{ label: string; value: string }> = ({ label, value }) => {
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
    <Badge variant="outline" className="gap-1 px-1.5 h-5 font-normal border-border/30 bg-background/30">
      <span className="text-muted-foreground flex items-center gap-1">
        {getIcon(label)}
        {label}:
      </span>
      <span className="font-mono text-foreground/80">{value}</span>
    </Badge>
  );
};

export const GovernanceAuditTrail: FC = () => {
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter] = useState<string>('all');
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
    void fetchLogs();
  }, []);

  const stats = useMemo(() => {
    if (logs.length === 0) return { total: 0, blockRate: 0, recoveryRate: 0, warnings: 0 };
    const total = logs.length;
    const blocks = logs.filter(l => l.action === 'block' || l.action === 'escalate').length;
    const warnings = logs.filter(l => l.action === 'warn').length;
    const retries = logs.filter(l => l.action === 'retry').length;
    const passesAfterRetry = logs.filter(l => l.status === 'pass' && l.rule.includes('retry')).length;

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
      case 'pass': return <CheckCircle2 size={14} />;
      case 'fail': return <XCircle size={14} />;
      case 'skip': return <Info size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getActionVariant = (action: string): "default" | "warning" | "destructive" | "success" | "outline" | "secondary" => {
    switch (action) {
      case 'block': return 'destructive';
      case 'escalate': return 'destructive';
      case 'warn': return 'warning';
      case 'retry': return 'secondary';
      case 'allow': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Checks', value: stats.total, icon: Activity, color: 'text-primary' },
          { label: 'Block Rate', value: `${stats.blockRate}%`, icon: ShieldAlert, color: 'text-destructive' },
          { label: 'Warnings', value: stats.warnings, icon: AlertTriangle, color: 'text-warning' },
          { label: 'Recovery Rate', value: `${stats.recoveryRate}%`, icon: RotateCcw, color: 'text-success' }
        ].map((stat, i) => (
          <Card key={i} className="bg-secondary/20 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("p-2 rounded-lg bg-background/50 border border-border/50", stat.color)}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</div>
                <div className="text-xl font-bold">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              placeholder="Search audit trail..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-border/50 hidden md:block" />
          <Button
            variant={groupByRun ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setGroupByRun(!groupByRun)}
            className="gap-2 h-9 text-xs font-bold"
          >
            <Layers size={14} />
            Group by Run
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="h-9 px-3"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
          <Activity className="size-8 text-primary animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Ingesting Audit Trail...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto text-destructive mb-4 opacity-50" size={48} />
            <h3 className="font-bold mb-1 text-foreground">Audit Stream Interrupted</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{error}</p>
          </CardContent>
        </Card>
      ) : groupedLogs.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-secondary/5">
          <CardContent className="p-24 text-center">
            <History size={48} className="mx-auto mb-6 text-muted-foreground/20" />
            <h3 className="text-muted-foreground font-bold tracking-tight">No Events Recorded</h3>
            <p className="text-muted-foreground/60 text-xs mt-1">Refine your filters or check system connection.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((group) => (
            <div key={group.id} className="space-y-4">
              {groupByRun && (
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap">
                    <Activity size={12} />
                    Run: <span className="text-foreground font-mono tracking-normal">{group.id === 'global' ? 'System Global' : group.id}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/50 via-border/50 to-transparent" />
                </div>
              )}

              <div className="grid gap-3">
                {group.items.map((log, idx) => {
                  const metadata = parseDetailMetadata(log.detail);
                  return (
                    <Card key={`${log.ts}-${idx}`} className="group border-border/50 bg-card/40 hover:bg-card/60 transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "mt-0.5 p-1.5 rounded-lg border",
                              log.status === 'pass' ? "bg-success/10 border-success/20 text-success" :
                                log.status === 'fail' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                  "bg-secondary border-border text-muted-foreground"
                            )}>
                              {getStatusIcon(log.status)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-foreground tracking-tight">{log.rule}</span>
                                <Badge variant={getActionVariant(log.action)} className="text-[9px] h-4 font-black uppercase tracking-widest">
                                  {log.action}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Clock size={12} className="opacity-50" />
                                  {new Date(log.ts).toLocaleTimeString()}
                                </div>
                                {log.ticket && (
                                  <div className="flex items-center gap-1.5 font-bold text-primary/70">
                                    <Target size={12} className="opacity-50" />
                                    <span className="font-mono">{log.ticket}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap md:justify-end gap-1.5 max-w-full md:max-w-[50%]">
                            {Object.entries(metadata).map(([key, val]) => (
                              <MetadataBadge key={key} label={key} value={val} />
                            ))}
                          </div>
                        </div>

                        {log.detail && (
                          <div className="mt-4 pt-4 border-t border-border/30">
                            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                              <Info size={10} />
                              Verification Insights
                            </div>
                            <div className="bg-background/40 rounded-lg p-3 border border-border/20 font-mono text-[11px] leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors whitespace-pre-wrap">
                              {log.detail}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
