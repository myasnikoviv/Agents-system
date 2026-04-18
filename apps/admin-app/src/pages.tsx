import { useEffect, useMemo, useState, type FormEvent } from 'react';

type GovernanceRule = {
  id: string;
  metadata: {
    name: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  evaluationType: string;
  enforcementMode: 'soft' | 'hard';
  is_enabled: boolean;
};

type ProjectPolicy = {
  projectId: string;
  executionProfile: 'engineering' | 'non_engineering';
  enabledRules: string[];
  disabledRules: string[];
};

type GovernanceOverride = {
  id: string;
  projectId: string;
  scope: 'global' | 'phase' | 'rule';
  ruleId?: string;
  reason: string;
  createdAt: string;
  expiresAt?: string;
  enabled: boolean;
};

type GovernanceLogEntry = {
  ts: string;
  rule: string;
  status: string;
  action: string;
  detail?: string;
  ticket?: string;
};

type TopologyService = {
  id: string;
  type: string;
  state?: string;
};

async function fetchStrict<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function Panel({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panelHead">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function GovernancePage() {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchStrict<{ rules?: GovernanceRule[] }>('/governance/rules');
      setRules(Array.isArray(data.rules) ? data.rules : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rules;
    return rules.filter((rule) => {
      const hay = `${rule.id} ${rule.metadata?.name || ''} ${rule.metadata?.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rules, search]);

  return (
    <Panel title="Governance" actions={<button onClick={() => void loadRules()}>Refresh</button>}>
      <div className="row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rules"
        />
      </div>
      {loading && <p>Loading rules…</p>}
      {error && <p>Rules load failed: {error}</p>}
      {!loading && !error && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Name</th>
                <th>Risk</th>
                <th>Eval</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.metadata?.name || '-'}</td>
                  <td>{rule.metadata?.riskLevel || '-'}</td>
                  <td>{rule.evaluationType}</td>
                  <td>{rule.enforcementMode}</td>
                  <td>{rule.is_enabled ? 'enabled' : 'disabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function PoliciesPage() {
  const [policy, setPolicy] = useState<ProjectPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectId = 'default';

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const data = await fetchStrict<{ policy?: ProjectPolicy }>(`/governance/projects/${projectId}/policy`);
      setPolicy(data.policy || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const toggleProfile = () => {
    if (!policy) return;
    setPolicy({
      ...policy,
      executionProfile: policy.executionProfile === 'engineering' ? 'non_engineering' : 'engineering',
    });
  };

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await fetchStrict(`/governance/projects/${projectId}/policy`, {
        method: 'POST',
        body: JSON.stringify(policy),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Policies" actions={<button onClick={() => void loadPolicy()}>Reload</button>}>
      {loading && <p>Loading policy…</p>}
      {error && <p>Policy error: {error}</p>}
      {!loading && policy && (
        <>
          <div className="kv">
            <div><b>Project:</b> {policy.projectId}</div>
            <div><b>Enabled rules:</b> {policy.enabledRules.length}</div>
            <div><b>Disabled rules:</b> {policy.disabledRules.length}</div>
            <div><b>Profile:</b> {policy.executionProfile}</div>
          </div>
          <div className="row">
            <button onClick={toggleProfile}>Toggle execution profile</button>
            <button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save policy'}</button>
          </div>
        </>
      )}
    </Panel>
  );
}

export function OverridesPage() {
  const [overrides, setOverrides] = useState<GovernanceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ projectId: 'global', scope: 'global', reason: '', ruleId: '', expiresAt: '' });

  const loadOverrides = async () => {
    setLoading(true);
    try {
      const data = await fetchStrict<{ overrides?: GovernanceOverride[] }>('/api/governance/overrides');
      setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverrides();
  }, []);

  const createOverride = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetchStrict('/api/governance/overrides', {
        method: 'POST',
        body: JSON.stringify({
          projectId: draft.projectId === 'global' ? '*' : draft.projectId,
          scope: draft.scope,
          reason: draft.reason,
          ruleId: draft.ruleId || undefined,
          expiresAt: draft.expiresAt || undefined,
        }),
      });
      setDraft({ projectId: 'global', scope: 'global', reason: '', ruleId: '', expiresAt: '' });
      await loadOverrides();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'unknown_error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Panel title="Overrides" actions={<button onClick={() => void loadOverrides()}>Refresh</button>}>
      <form onSubmit={createOverride} className="formGrid">
        <input value={draft.projectId} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} placeholder="projectId or global" />
        <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
          <option value="global">global</option>
          <option value="phase">phase</option>
          <option value="rule">rule</option>
        </select>
        <input value={draft.ruleId} onChange={(e) => setDraft({ ...draft, ruleId: e.target.value })} placeholder="ruleId (optional)" />
        <input value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} placeholder="expiresAt ISO (optional)" />
        <input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="reason" required />
        <button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create override'}</button>
      </form>
      {loading && <p>Loading overrides…</p>}
      {error && <p>Overrides error: {error}</p>}
      {!loading && !error && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Scope</th>
                <th>Rule</th>
                <th>Reason</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.projectId}</td>
                  <td>{o.scope}</td>
                  <td>{o.ruleId || '-'}</td>
                  <td>{o.reason}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function MonitoringPage() {
  const [services, setServices] = useState<TopologyService[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [topology, overview] = await Promise.all([
        fetchStrict<{ services?: TopologyService[] }>('/api/cockpit/topology/services'),
        fetchStrict<{ metrics?: Record<string, unknown> }>('/api/cockpit/metrics/overview'),
      ]);
      setServices(Array.isArray(topology.services) ? topology.services : []);
      setMetrics(overview.metrics || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Panel title="Monitoring" actions={<button onClick={() => void load()}>Refresh</button>}>
      {loading && <p>Loading monitoring data…</p>}
      {error && <p>Monitoring error: {error}</p>}
      {!loading && !error && (
        <>
          <div className="kv">
            <div><b>Services:</b> {services.length}</div>
            <div><b>Metrics payload:</b> {metrics ? 'present' : 'empty'}</div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Type</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.type}</td>
                    <td>{s.state || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchStrict<{ logs?: GovernanceLogEntry[] }>('/api/governance/logs');
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Panel title="Audit" actions={<button onClick={() => void load()}>Refresh</button>}>
      {loading && <p>Loading audit logs…</p>}
      {error && <p>Audit load failed: {error}</p>}
      {!loading && !error && logs.length === 0 && <p>No audit logs found.</p>}
      {!loading && !error && logs.length > 0 && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Rule</th>
                <th>Status</th>
                <th>Action</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 100).map((log, idx) => (
                <tr key={`${log.ts}-${log.rule}-${idx}`}>
                  <td>{new Date(log.ts).toLocaleString()}</td>
                  <td>{log.rule}</td>
                  <td>{log.status}</td>
                  <td>{log.action}</td>
                  <td>{log.ticket || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
