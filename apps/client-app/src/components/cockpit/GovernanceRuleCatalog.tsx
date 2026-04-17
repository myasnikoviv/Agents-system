import { useState, useEffect, type FC } from 'react';
import { Search, Shield, AlertTriangle, Cpu, CheckCircle, Info, Settings, Activity } from 'lucide-react';
import { fetchJsonStrict } from '../../lib/http';
import type { GovernanceRule } from './governanceTypes';
import { Card, CardContent, CardHeader, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface GovernanceRuleCatalogProps {
  onEditRule?: (ruleId: string) => void;
  onRefresh?: () => void;
}

const GovernanceRuleCatalog: FC<GovernanceRuleCatalogProps> = ({ onEditRule }) => {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');

  useEffect(() => {
    void loadRules();
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
      case 'deterministic': return <Shield size={14} className="text-primary" />;
      case 'heuristic': return <Cpu size={14} className="text-accent" />;
      case 'agentic': return <Cpu size={14} className="text-warning" />;
      default: return <Info size={14} className="text-muted-foreground" />;
    }
  };

  const getRiskVariant = (level: string): "default" | "warning" | "destructive" | "success" | "outline" | "secondary" => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-background/50 border border-border/50 p-1 rounded-lg">
            {['all', 'deterministic', 'agentic'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterType(type)}
                className={cn(
                  "h-7 text-[10px] font-bold uppercase tracking-wider px-3",
                  filterType === type && "bg-secondary shadow-sm"
                )}
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="flex bg-background/50 border border-border/50 p-1 rounded-lg">
            {['all', 'hard', 'soft'].map((mode) => (
              <Button
                key={mode}
                variant={filterMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilterMode(mode)}
                className={cn(
                  "h-7 text-[10px] font-bold uppercase tracking-wider px-3",
                  filterMode === mode && "bg-secondary shadow-sm"
                )}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-secondary/10 rounded-xl border border-dashed border-border/50">
          <div className="flex flex-col items-center gap-3">
            <Activity className="size-8 text-primary animate-pulse" />
            <span className="text-muted-foreground font-medium text-sm">Loading rule registry...</span>
          </div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-secondary/10 rounded-xl border border-dashed border-border/50">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Search className="size-8 opacity-20" />
            <p className="text-sm">No rules match your filters</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredRules.map(rule => (
            <Card
              key={rule.id}
              className="group border-border/50 bg-card/40 hover:bg-card/60 hover:border-border transition-all duration-300 flex flex-col"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    rule.enforcementMode === 'hard' ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                  )}>
                    {rule.enforcementMode === 'hard' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{rule.metadata.name}</h3>
                    <code className="text-[10px] text-muted-foreground uppercase tracking-widest">{rule.id}</code>
                  </div>
                </div>
                <Badge variant={rule.is_enabled ? 'default' : 'secondary'} className="h-5">
                  {rule.is_enabled ? 'Active' : 'Disabled'}
                </Badge>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                  {rule.metadata.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline" className="gap-1.5 h-6 font-medium border-border/50">
                    {getTypeIcon(rule.evaluationType)}
                    {rule.evaluationType}
                  </Badge>
                  <Badge variant="secondary" className="h-6 gap-1 font-medium bg-secondary/50">
                    <Shield size={10} className="text-muted-foreground" />
                    v{rule.metadata.version}
                  </Badge>
                  {rule.metadata.riskLevel && (
                    <Badge variant={getRiskVariant(rule.metadata.riskLevel)} className="h-6 gap-1 font-bold uppercase tracking-tighter">
                      <AlertTriangle size={10} />
                      {rule.metadata.riskLevel}
                    </Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-4 border-t border-border/20 bg-secondary/10">
                <div className="flex -space-x-1">
                  {(rule.metadata.tags || []).slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5 border-border/30 bg-background/50 font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditRule?.(rule.id)}
                  className="h-8 gap-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <Settings size={14} />
                  Configure
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GovernanceRuleCatalog;
