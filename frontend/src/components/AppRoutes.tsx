import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CockpitPage } from './cockpit/CockpitPage';
import { CockpitSettingsPage } from './cockpit/CockpitSettingsPage';

export function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/cockpit" replace />} />
        <Route path="/cockpit" element={<CockpitPage />} />
        <Route path="/cockpit/settings" element={<CockpitSettingsPage />} />
        <Route path="/cockpit/settings/:section" element={<CockpitSettingsPage />} />
        <Route path="/cockpit/:section" element={<CockpitPage />} />
      </Routes>
    </Router>
  );
}
