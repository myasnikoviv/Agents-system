import { useState, useEffect, type FC } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  LayoutGrid,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { ProjectPolicy, GovernanceRule } from './governanceTypes';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

interface EvidenceOverrideManagerProps {
  projectId?: string;
}

export const EvidenceOverrideManager: FC<EvidenceOverrideManagerProps> = ({ projectId = 'default' }) => {
  const [policy, setPolicy] = useState<ProjectPolicy | null>(null);
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [policyData, rulesData] = await Promise.all([
        fetchJsonStrict<{ policy: ProjectPolicy }>(`/governance/projects/${projectId}/policy`),
        fetchJsonStrict<{ rules: GovernanceRule[] }>('/governance/rules')
      ]);
      setPolicy(policyData.policy);
      setRules(rulesData.rules || []);
      setMessage(null);
    } catch (err) {
      console.error('Failed to load policy or rules:', err);
      setMessage({ type: 'error', text: 'Failed to load governance policy' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

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
      <div className="flex flex-col items-center justify-center h-64 bg-secondary/10 rounded-xl border border-dashed border-border/50">
        <Loader2 className="animate-spin text-primary/50 mb-3" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Syncing project protocols...</span>
      </div>
    );
  }

  if (!policy) return null;

  const activeOverrides = Object.keys(policy.ruleOverrides);
  const availableRules = rules.filter(r => !activeOverrides.includes(r.id));

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-secondary/5 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Database className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Evidence Overrides</h2>
              <p className="text-xs text-muted-foreground">Configure project-specific file patterns for rule compliance.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {message && (
              <Badge 
                variant={message.type === 'success' ? "outline" : "destructive"}
                className={`flex items-center gap-2 h-8 px-3 text-[10px] font-bold uppercase tracking-wider ${message.type === 'success' ? 'border-emerald-500/30 text-emerald-500' : ''}`}
              >
                {message.type === 'success' ? <CheckCircle className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {message.text}
              </Badge>
            )}
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="font-black text-[10px] uppercase tracking-widest px-6 h-9 shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="animate-spin size-3.5 mr-2" /> : <Save className="size-3.5 mr-2" />}
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Overrides */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
            <FileText className="size-3.5" />
            Active Project Overrides
          </h3>
          
          {activeOverrides.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-secondary/5 rounded-xl border border-dashed border-border/50 text-muted-foreground text-xs italic">
              No active overrides. Use the rule catalog to define patterns.
            </div>
          ) : (
            <div className="space-y-4">
              {activeOverrides.map(ruleId => {
                const rule = rules.find(r => r.id === ruleId);
                const override = policy.ruleOverrides[ruleId];
                if (!rule) return null;

                return (
                  <Card key={ruleId} className="border-border/50 bg-secondary/5 hover:border-primary/30 transition-all overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-background border border-border flex items-center justify-center text-primary/70 shadow-sm">
                             <ShieldCheck className="size-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{rule.metadata.name}</h4>
                            <Badge variant="outline" className="text-[9px] font-mono uppercase tracking-widest opacity-50 h-4 border-muted">
                              {ruleId}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOverride(ruleId)}
                          className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="space-y-3 pt-2">
                         <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-1">File Patterns (Regex/Glob)</label>
                         <div className="grid grid-cols-1 gap-2">
                           {(override.evidence || []).map((pattern, idx) => (
                             <div key={idx} className="relative group">
                               <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                               <Input
                                 value={pattern}
                                 onChange={(e) => updateEvidence(ruleId, idx, e.target.value)}
                                 placeholder="e.g. src/tests/**/*.spec.ts"
                                 className="pl-9 h-9 bg-background/50 text-xs font-mono"
                               />
                             </div>
                           ))}
                         </div>
                         <p className="text-[9px] text-muted-foreground/70 italic ml-1">
                           The governance engine will prioritize these paths when extracting compliance signals.
                         </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Rules Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
            <LayoutGrid className="size-3.5" />
            Rule Registry
          </h3>
          <Card className="border-border/50 bg-background/50 overflow-hidden shadow-sm">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-border/30">
                {availableRules.length === 0 ? (
                  <div className="p-8 text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest italic">
                    Full project coverage achieved.
                  </div>
                ) : (
                  availableRules.map(rule => (
                    <div key={rule.id} className="p-4 hover:bg-secondary/20 transition-colors group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{rule.metadata.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-1">{rule.metadata.description}</p>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => addOverride(rule.id)}
                          className="size-7 p-0 bg-background hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EvidenceOverrideManager;
