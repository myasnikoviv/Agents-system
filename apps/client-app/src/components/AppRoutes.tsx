import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CockpitPage from './cockpit/CockpitPage';
import { CockpitSettingsPage } from './cockpit/CockpitSettingsPage';
import { GovernanceCenterPage } from './cockpit/GovernanceCenterPage';
import { GovernanceAuditTrail } from './cockpit/GovernanceAuditTrail';
import { LoginPage } from './auth/LoginPage';
import { AuthGuard } from './auth/AuthGuard';
import { PageShell } from './ui/page-shell';

export function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cockpit/*" element={
          <AuthGuard>
            <Routes>
              <Route path="/" element={<CockpitPage />} />
              <Route path="/settings" element={<CockpitSettingsPage />} />
              <Route path="/settings/:section" element={<CockpitSettingsPage />} />
              <Route path="/governance" element={<Navigate to="/admin/governance" replace />} />
              <Route path="/observability" element={<Navigate to="/admin/monitoring" replace />} />
              <Route path="/:section" element={<CockpitPage />} />
            </Routes>
          </AuthGuard>
        } />
        <Route path="/admin/*" element={
          <AuthGuard minRole="admin">
            <PageShell title="Platform Console">
              <Routes>
                <Route path="/" element={<Navigate to="/admin/governance" replace />} />
                <Route path="/governance" element={<GovernanceCenterPage />} />
                <Route path="/policies" element={<Navigate to="/admin/governance?tab=policy" replace />} />
                <Route path="/overrides" element={<Navigate to="/admin/governance?tab=manual" replace />} />
                <Route path="/audit" element={<GovernanceAuditTrail />} />
                <Route path="/monitoring" element={<Navigate to="/admin/governance?tab=audit" replace />} />
              </Routes>
            </PageShell>
          </AuthGuard>
        } />
        <Route path="/" element={<Navigate to="/cockpit" replace />} />
      </Routes>
    </Router>
  );
}
