import { BrowserRouter as Router, Navigate, useRoutes } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { clientRouteGroup } from '../routing/route-groups';

const ADMIN_APP_URL = import.meta.env.VITE_ADMIN_URL || 'http://127.0.0.1:3001';

function AdminRedirect() {
  const target = new URL(ADMIN_APP_URL);
  target.pathname = window.location.pathname;
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.location.href = target.toString();
  return null;
}

function AppRouteTree() {
  return useRoutes([
    { path: '/login', element: <LoginPage /> },
    clientRouteGroup,
    { path: '/admin/*', element: <AdminRedirect /> },
    { path: '/', element: <Navigate to="/cockpit" replace /> },
  ]);
}

export function AppRoutes() {
  return (
    <Router>
      <AppRouteTree />
    </Router>
  );
}
