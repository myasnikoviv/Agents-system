export type UiOwnership = 'client' | 'admin';

export interface OwnedSurface {
  id: string;
  ownership: UiOwnership;
}

export const UI_OWNERSHIP_MAP: OwnedSurface[] = [
  { id: 'CockpitPage', ownership: 'client' },
  { id: 'CockpitSettingsPage', ownership: 'client' },
  { id: 'AdminApp/GovernancePage', ownership: 'admin' },
  { id: 'AdminApp/PoliciesPage', ownership: 'admin' },
  { id: 'AdminApp/OverridesPage', ownership: 'admin' },
  { id: 'AdminApp/AuditPage', ownership: 'admin' },
  { id: 'AdminApp/MonitoringPage', ownership: 'admin' },
];
