import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuditPage, GovernancePage, MonitoringPage, OverridesPage, PoliciesPage } from './pages';
import { AdminGuard } from './AdminGuard';

const NAV = [
  { to: '/admin/governance', label: 'Governance' },
  { to: '/admin/policies', label: 'Policies' },
  { to: '/admin/overrides', label: 'Overrides' },
  { to: '/admin/audit', label: 'Audit' },
  { to: '/admin/monitoring', label: 'Monitoring' },
];

export function AdminApp() {
  return (
    <AdminGuard>
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
            <Route path="/admin/governance" element={<GovernancePage />} />
            <Route path="/admin/policies" element={<PoliciesPage />} />
            <Route path="/admin/overrides" element={<OverridesPage />} />
            <Route path="/admin/audit" element={<AuditPage />} />
            <Route path="/admin/monitoring" element={<MonitoringPage />} />
          </Routes>
        </main>
      </div>
    </AdminGuard>
  );
}
