import { Link, Navigate, Route, Routes } from 'react-router-dom';

const NAV = [
  { to: '/admin/governance', label: 'Governance' },
  { to: '/admin/policies', label: 'Policies' },
  { to: '/admin/overrides', label: 'Overrides' },
  { to: '/admin/audit', label: 'Audit' },
  { to: '/admin/monitoring', label: 'Monitoring' },
];

function Page({ title }: { title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>Admin surface is separated into its own deploy unit (`apps/admin-app`).</p>
    </section>
  );
}

export function AdminApp() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Admin Console</h1>
        <nav>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/governance" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/governance" replace />} />
          <Route path="/admin/governance" element={<Page title="Governance" />} />
          <Route path="/admin/policies" element={<Page title="Policies" />} />
          <Route path="/admin/overrides" element={<Page title="Overrides" />} />
          <Route path="/admin/audit" element={<Page title="Audit" />} />
          <Route path="/admin/monitoring" element={<Page title="Monitoring" />} />
        </Routes>
      </main>
    </div>
  );
}
