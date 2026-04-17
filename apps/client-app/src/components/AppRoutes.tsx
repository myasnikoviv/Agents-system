import { BrowserRouter as Router, Navigate, useRoutes } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { adminRouteGroup, clientRouteGroup } from '../routing/route-groups';

function AppRouteTree() {
  return useRoutes([
    { path: '/login', element: <LoginPage /> },
    clientRouteGroup,
    adminRouteGroup,
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
