import { useState, useEffect, type FC } from 'react';
import { Save, AlertTriangle, Shield, Settings, Info, CheckCircle, Trash2, Activity, FileLock, History } from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceRule } from './governanceTypes';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

interface GovernanceRuleEditorProps {
  ruleId: string;
  onClose: () => void;
  onSaved: () => void;
}

const GovernanceRuleEditor: FC<GovernanceRuleEditorProps> = ({ ruleId, onClose, onSaved }) => {
  const [rule, setRule] = useState<GovernanceRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRule();
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
        method: 'POST',
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

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 border-l border-border/50 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="p-6 border-b border-border/50 bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold tracking-tight">Configure Rule</SheetTitle>
              <code className="text-[10px] text-muted-foreground uppercase tracking-widest">{ruleId}</code>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
          {loading ? (
            <div className="space-y-6">
              <Card className="animate-pulse bg-secondary/20 border-border/50">
                <CardContent className="h-32" />
              </Card>
              <div className="h-8 w-32 bg-secondary/20 animate-pulse rounded" />
              <Card className="animate-pulse bg-secondary/20 border-border/50">
                <CardContent className="h-48" />
              </Card>
            </div>
          ) : error ? (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="mx-auto text-destructive mb-3" size={32} />
                <p className="text-sm font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={loadRule} className="mt-4">Try Again</Button>
              </CardContent>
            </Card>
          ) : rule ? (
            <>
              {/* Info Card */}
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Info className="size-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">{rule.metadata.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {rule.metadata.description}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-3 border-t border-border/30">
                    <span className="flex items-center gap-1"><History size={10} /> v{rule.metadata.version}</span>
                    <span className="flex items-center gap-1 font-bold">Owner: {rule.metadata.owner}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Risk & Compliance Extension */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="size-3" />
                  Risk & Compliance
                </h4>
                <div className="space-y-6 bg-secondary/20 p-5 rounded-xl border border-border/50">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-3 uppercase tracking-wider">Risk Level</label>
                    <div className="flex flex-wrap gap-2">
                      {['low', 'medium', 'high', 'critical'].map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={rule.metadata.riskLevel === level ? 'default' : 'outline'}
                          onClick={() => setRule({
                            ...rule,
                            metadata: { ...rule.metadata, riskLevel: level as any }
                          })}
                          className={cn(
                            "h-8 text-[10px] font-bold uppercase tracking-widest px-4",
                            rule.metadata.riskLevel === level && "shadow-lg shadow-primary/20"
                          )}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-2 uppercase tracking-wider">Impact Areas</label>
                      <div className="flex flex-wrap gap-2">
                        {['reliability', 'security', 'cost', 'privacy', 'legal'].map((area) => {
                          const isActive = (rule.metadata.impactArea || []).includes(area);
                          return (
                            <Badge
                              key={area}
                              variant={isActive ? 'secondary' : 'outline'}
                              onClick={() => {
                                const current = rule.metadata.impactArea || [];
                                const next = isActive ? current.filter(a => a !== area) : [...current, area];
                                setRule({ ...rule, metadata: { ...rule.metadata, impactArea: next } });
                              }}
                              className="cursor-pointer gap-1.5 py-1.5 px-3 uppercase text-[9px] font-black"
                            >
                              <Activity size={10} />
                              {area}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enforcement Control */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Settings className="size-3" />
                  Enforcement Profile
                </h4>
                <div className="space-y-6 bg-secondary/20 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground block uppercase tracking-wider">State</label>
                      <p className="text-[10px] text-muted-foreground">Enabled across all clusters</p>
                    </div>
                    <Button
                      size="sm"
                      variant={rule.is_enabled ? 'default' : 'secondary'}
                      onClick={() => setRule({ ...rule, is_enabled: !rule.is_enabled })}
                      className="h-8 font-black text-[10px] uppercase px-4"
                    >
                      {rule.is_enabled ? 'Active' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <label className="text-xs font-bold text-foreground block mb-3 uppercase tracking-wider">Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={rule.enforcementMode === 'soft' ? 'secondary' : 'outline'}
                        onClick={() => setRule({ ...rule, enforcementMode: 'soft' })}
                        className="h-16 flex flex-col gap-1 border-border/50"
                      >
                        <CheckCircle size={14} />
                        <span className="text-[10px] font-bold uppercase">Soft (Advice)</span>
                      </Button>
                      <Button
                        variant={rule.enforcementMode === 'hard' ? 'destructive' : 'outline'}
                        onClick={() => setRule({ ...rule, enforcementMode: 'hard' })}
                        className="h-16 flex flex-col gap-1 border-border/50"
                      >
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-bold uppercase">Hard (Block)</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Log Summary */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileLock className="size-3" />
                  Logic Manifest
                </h4>
                <div className="bg-background/40 border border-border/30 rounded-xl overflow-hidden p-1">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-secondary/50 text-muted-foreground/60 uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-3 py-2">Artifact Key</th>
                        <th className="px-3 py-2 text-right">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {rule.evidence.map(key => (
                        <tr key={key} className="hover:bg-secondary/20 transition-colors italic">
                          <td className="px-3 py-2 text-primary/80 font-mono tracking-tight">{key}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground font-bold">MANDATORY</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <SheetFooter className="p-6 border-t border-border/50 bg-secondary/10 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold gap-2"
          >
            <Trash2 size={14} />
            Archive Rule
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="font-bold text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="px-8 font-black text-xs uppercase shadow-xl shadow-primary/20"
            >
              {saving ? <div className="animate-spin h-3 w-3 border-b-2 border-current rounded-full mr-2" /> : <Save size={14} className="mr-2" />}
              {saving ? 'Syncing...' : 'Commit Changes'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default GovernanceRuleEditor;
