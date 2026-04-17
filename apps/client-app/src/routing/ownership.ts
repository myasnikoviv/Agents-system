export type UiOwnership = 'client' | 'admin';

export interface OwnedSurface {
  id: string;
  ownership: UiOwnership;
}

export const UI_OWNERSHIP_MAP: OwnedSurface[] = [
  { id: 'CockpitPage', ownership: 'client' },
  { id: 'CockpitSettingsPage', ownership: 'client' },
  { id: 'GovernanceCenterPage', ownership: 'admin' },
  { id: 'GovernanceRuleCatalog', ownership: 'admin' },
  { id: 'GovernanceRuleEditor', ownership: 'admin' },
  { id: 'ProjectPolicyManager', ownership: 'admin' },
  { id: 'ManualOverrideManager', ownership: 'admin' },
  { id: 'EvidenceOverrideManager', ownership: 'admin' },
  { id: 'GovernanceAuditTrail', ownership: 'admin' },
  { id: 'ObservabilityPanels', ownership: 'admin' },
];
