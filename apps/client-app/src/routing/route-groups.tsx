import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { AuthGuard } from '../components/auth/AuthGuard';
import CockpitPage from '../components/cockpit/CockpitPage';
import { CockpitSettingsPage } from '../components/cockpit/CockpitSettingsPage';
import { GovernanceAuditTrail } from '../components/cockpit/GovernanceAuditTrail';
import { GovernanceCenterPage } from '../components/cockpit/GovernanceCenterPage';
import { PageShell } from '../components/ui/page-shell';

function ClientLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}

function AdminLayout() {
  return (
    <AuthGuard minRole="admin">
      <PageShell title="Platform Console" mode="admin">
        <Outlet />
      </PageShell>
    </AuthGuard>
  );
}

export const clientRouteGroup: RouteObject = {
  path: '/cockpit',
  element: <ClientLayout />,
  children: [
    { index: true, element: <CockpitPage /> },
    { path: 'settings', element: <CockpitSettingsPage /> },
    { path: 'settings/:section', element: <CockpitSettingsPage /> },
    { path: 'governance', element: <Navigate to="/admin/governance" replace /> },
    { path: 'observability', element: <Navigate to="/admin/monitoring" replace /> },
    { path: ':section', element: <CockpitPage /> },
  ],
};

export const adminRouteGroup: RouteObject = {
  path: '/admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <Navigate to="/admin/governance" replace /> },
    { path: 'governance', element: <GovernanceCenterPage /> },
    { path: 'policies', element: <Navigate to="/admin/governance?tab=policy" replace /> },
    { path: 'overrides', element: <Navigate to="/admin/governance?tab=manual" replace /> },
    { path: 'audit', element: <GovernanceAuditTrail /> },
    { path: 'monitoring', element: <Navigate to="/admin/governance?tab=audit" replace /> },
  ],
};
