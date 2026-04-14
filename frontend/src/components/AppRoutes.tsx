import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CockpitPage } from './cockpit/CockpitPage';
import { CockpitSettingsPage } from './cockpit/CockpitSettingsPage';
import { GovernanceCenterPage } from './cockpit/GovernanceCenterPage';
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
            <PageShell>
              <Routes>
                <Route path="/" element={<CockpitPage />} />
                <Route path="/settings" element={<CockpitSettingsPage />} />
                <Route path="/settings/:section" element={<CockpitSettingsPage />} />
                <Route path="/governance" element={<GovernanceCenterPage />} />
                <Route path="/:section" element={<CockpitPage />} />
              </Routes>
            </PageShell>
          </AuthGuard>
        } />
        <Route path="/" element={<Navigate to="/cockpit" replace />} />
      </Routes>
    </Router>
  );
}
