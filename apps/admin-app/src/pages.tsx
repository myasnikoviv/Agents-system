import { useEffect, useState } from 'react';

type GovernanceLogEntry = {
  ts: string;
  rule: string;
  status: string;
  action: string;
  detail?: string;
  ticket?: string;
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function GovernancePage() {
  return (
    <Panel title="Governance">
      <p>Platform governance controls live in dedicated admin surface.</p>
    </Panel>
  );
}

export function PoliciesPage() {
  return (
    <Panel title="Policies">
      <p>Project and global policy management is now isolated from cockpit/client UI.</p>
    </Panel>
  );
}

export function OverridesPage() {
  return (
    <Panel title="Overrides">
      <p>Manual and evidence overrides are available only from admin console.</p>
    </Panel>
  );
}

export function MonitoringPage() {
  return (
    <Panel title="Monitoring">
      <p>System-level observability and cost/health tracking is operator-only.</p>
    </Panel>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/governance/logs');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as { logs?: GovernanceLogEntry[] };
        setLogs(Array.isArray(json.logs) ? json.logs : []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'unknown error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Panel title="Audit">
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
              {logs.slice(0, 50).map((log, idx) => (
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
