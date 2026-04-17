import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { AuthGuard } from '../components/auth/AuthGuard';
import CockpitPage from '../components/cockpit/CockpitPage';
import { CockpitSettingsPage } from '../components/cockpit/CockpitSettingsPage';

function ClientLayout() {
  return (
    <AuthGuard>
      <Outlet />
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
