import { useEffect, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const GovernanceCenterPage: FC = () => {
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
    <>
      <div className="mx-auto max-w-[1400px] px-6 py-6 h-full flex flex-col">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Governance Center</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monitor and manage agentic compliance rules and safety filters</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadStats()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Stats
            </Button>
            <Badge variant="success" className="gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Engine Online
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Rules', value: stats.totalRules, icon: Shield, color: 'text-primary' },
            { label: 'Active Policies', value: stats.activeRules, icon: CheckCircle2, color: 'text-success' },
            { label: 'Project Overrides', value: stats.projectOverrides, icon: Database, color: 'text-accent' },
            { label: 'Pending Safety', value: stats.pendingManual, icon: Clock, color: 'text-warning' }
          ].map((stat, i) => (
            <Card key={i} className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon size={16} className={stat.color} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab System */}
        <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="flex-1 flex flex-col">
          <TabsList className="bg-secondary/50 border border-border/50 p-1 mb-6">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-2 px-6 py-2"
              >
                <tab.icon size={14} />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-visible">
            <TabsContent value="catalog" className="m-0 focus-visible:ring-0">
              <GovernanceRuleCatalog
                onEditRule={(id) => setEditingRuleId(id)}
                onRefresh={loadStats}
              />
            </TabsContent>

            <TabsContent value="policy" className="m-0 focus-visible:ring-0">
              <ProjectPolicyManager projectId="default" />
            </TabsContent>

            <TabsContent value="manual" className="m-0 focus-visible:ring-0">
              <ManualOverrideManager />
            </TabsContent>

            <TabsContent value="audit" className="m-0 focus-visible:ring-0">
              <GovernanceAuditTrail />
            </TabsContent>
          </div>
        </Tabs>
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
    </>
  );
};
