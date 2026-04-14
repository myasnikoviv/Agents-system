import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CockpitPage } from './cockpit/CockpitPage';
import { CockpitSettingsPage } from './cockpit/CockpitSettingsPage';
import { GovernanceCenterPage } from './cockpit/GovernanceCenterPage';
import { LoginPage } from './auth/LoginPage';
import { AuthGuard } from './auth/AuthGuard';

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
              <Route path="/governance" element={<GovernanceCenterPage />} />
              <Route path="/:section" element={<CockpitPage />} />
            </Routes>
          </AuthGuard>
        } />
        <Route path="/" element={<Navigate to="/cockpit" replace />} />
      </Routes>
    </Router>
  );
}
