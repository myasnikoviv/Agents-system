import { useState, useEffect, type FC, type FormEvent } from 'react';
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
  Loader2,
  X
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceManualOverride } from './governanceTypes';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

export const ManualOverrideManager: FC = () => {
  const [overrides, setOverrides] = useState<GovernanceManualOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
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
      setOverrides(data.overrides || []);
      setError(null);
    } catch (err) {
      setError('Failed to load overrides');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOverrides();
  }, []);

  const handleCreate = async (e: FormEvent) => {
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
      void fetchOverrides();
    } catch (err) {
      console.error('Failed to create override:', err);
    }
  };

  const labelClass = "text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 ml-1";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-secondary/10 p-4 rounded-xl border border-border/50">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Manual Overrides
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Emergency bypasses for governance rules. Use with caution.
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          variant={isCreating ? "outline" : "destructive"}
          className="shadow-xl shadow-destructive/10 uppercase font-black text-[10px] tracking-widest"
        >
          {isCreating ? <X className="size-4 mr-2" /> : <Plus className="size-4 mr-2" />}
          {isCreating ? 'Cancel' : 'New Override'}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-6">
             <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelClass}>Project ID</label>
                  <Input
                    placeholder="Specific Project or 'global'"
                    className="bg-background/50 font-mono text-xs"
                    value={newOverride.projectId}
                    onChange={e => setNewOverride({ ...newOverride, projectId: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Scope</label>
                  <select
                    className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-destructive/20 transition-all outline-none appearance-none"
                    value={newOverride.scope}
                    onChange={e => setNewOverride({ ...newOverride, scope: e.target.value as any })}
                  >
                    <option value="global">Global (Full Bypass)</option>
                    <option value="phase">Phase Level</option>
                    <option value="rule">Specific Rule</option>
                  </select>
                </div>
                {newOverride.scope === 'rule' && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className={labelClass}>Rule ID</label>
                    <Input
                      placeholder="e.g. AG-004-TESTS"
                      className="bg-background/50 font-mono text-xs"
                      value={newOverride.ruleId}
                      onChange={e => setNewOverride({ ...newOverride, ruleId: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Justification (Required)</label>
                  <textarea
                    placeholder="Why is this override necessary?"
                    className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-destructive/20 transition-all outline-none h-24 resize-none"
                    value={newOverride.reason}
                    onChange={e => setNewOverride({ ...newOverride, reason: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Expiration (Optional)</label>
                  <Input
                    type="datetime-local"
                    className="bg-background/50 text-xs"
                    value={newOverride.expiresAt}
                    onChange={e => setNewOverride({ ...newOverride, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="px-8 font-black text-xs uppercase shadow-xl shadow-destructive/20"
                >
                  Apply Emergency Override
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
          <Loader2 className="animate-spin text-destructive/50" size={32} />
          <p className="text-xs font-bold uppercase tracking-widest italic">Syncing override registry...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <AlertCircle className="mx-auto text-destructive" size={40} />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchOverrides()} className="font-bold text-[10px] uppercase">Retry Sync</Button>
        </Card>
      ) : overrides.length === 0 ? (
        <div className="bg-secondary/5 border border-dashed border-border rounded-xl p-20 text-center space-y-4 flex flex-col items-center">
          <div className="bg-secondary/20 w-16 h-16 rounded-full flex items-center justify-center">
            <ShieldCheck className="text-emerald-500" size={32} />
          </div>
          <div>
            <h3 className="text-foreground font-bold text-sm uppercase tracking-tight">Compliance Mode Active</h3>
            <p className="text-muted-foreground text-xs mt-1 italic">No active overrides. System is in full compliance.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {overrides.map((override) => (
            <Card 
              key={override.id}
              className="border-border/50 bg-secondary/5 hover:border-destructive/30 transition-all group overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${override.enabled ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase tracking-tight">
                          {override.scope} BYPASS
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider h-4 px-1.5">
                          {override.projectId === '*' ? 'GLOBAL' : override.projectId}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-mono mt-1 opacity-50">{override.id}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-border/50 pl-4 py-1 bg-background/30 rounded-r-md">
                    "{override.reason}"
                  </p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-border/10">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <User size={12} className="text-muted-foreground" />
                      <span className="text-muted-foreground uppercase font-bold tracking-widest">Actor: <span className="text-foreground">{override.actorId}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Calendar size={12} className="text-muted-foreground" />
                      <span className="text-muted-foreground uppercase font-bold tracking-widest">Enacted: <span className="text-foreground">{new Date(override.createdAt).toLocaleDateString()}</span></span>
                    </div>
                    {override.expiresAt && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Tag size={12} className="text-amber-500/70" />
                        <span className="text-amber-500/70 uppercase font-bold tracking-widest">Expires: <span className="text-amber-200">{new Date(override.expiresAt).toLocaleString()}</span></span>
                      </div>
                    )}
                    {override.ruleId && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Briefcase size={12} className="text-primary/70" />
                        <span className="text-primary/70 uppercase font-bold tracking-widest">Target: <span className="text-primary-foreground/90 bg-primary/20 px-1 rounded">{override.ruleId}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualOverrideManager;
