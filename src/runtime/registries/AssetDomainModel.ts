import crypto from 'crypto';

/**
 * AGSYS-3501 — Asset Identity Model
 * Formalizing declarative assets as first-class system entities.
 */

export type AssetType = 
  | 'agent'
  | 'pipeline'
  | 'skill'
  | 'loop'
  | 'governance_rule'
  | 'governance_profile'
  | 'meeting_spec'
  | 'project_manifest'
  | 'template'
  | 'team_template'
  | 'role_template'
  | 'workforce_template';

export type AssetStatus = 
  | 'discovered'
  | 'validated'
  | 'normalized'
  | 'registered'
  | 'active'
  | 'quarantine';

export type AssetApprovalState = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalation_required';

export type CustomizationLevel = 
  | 'original'     // Direct use of system/platform library
  | 'clone'        // Unmodified copy of a template
  | 'fork'         // Template copy with version deviation
  | 'custom';      // Manual or fully autonomous creation

export interface AssetLineage {
  source_template_id?: string;
  source_template_version?: string;
  lineage_parent_asset_id?: string;
  customization_level: CustomizationLevel;
}

export interface AssetIdentity {
  asset_id: string;        // Hashed/Deterministic ID
  asset_type: AssetType;
  slug: string;            // Human-readable identifier (e.g. pm-orchestrator)
  tenant_id: string;
  workspace_id: string;
  project_id: string;
}

export interface AssetProjectContext {
  tenant_id: string;
  workspace_id: string;
  project_id: string;
}

export interface AssetMetadata {
  name: string;
  version: string;
  status: AssetStatus;
  approval_state: AssetApprovalState;
  storage_ref: string;     // Filesystem path, Git SHA, or internal storage key
  compatibility_state?: string;
  tags?: string[];
  owner_role?: string;     // Role identifier (e.g. solution-architect)
  checksum?: string;       // SHA-256 hash of attributes for integrity verification
}

/**
 * Calculates a SHA-256 checksum of the asset attributes.
 */
export function calculateAssetChecksum(attributes: any): string {
  const content = JSON.stringify(attributes || {});
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Deterministic Asset ID generation logic.
 * Ensures stability across project renames (if project_id is stable) 
 * or purely path-based identification.
 */
export function generateAssetId(params: {
  tenant_id: string;
  workspace_id: string;
  project_id: string;
  asset_type: AssetType;
  slug: string;
}): string {
  const salt = 'agsys-assets-v1';
  const raw = `${params.tenant_id}:${params.workspace_id}:${params.project_id}:${params.asset_type}:${params.slug}:${salt}`;
  
  return crypto
    .createHash('sha256')
    .update(raw)
    .digest('hex')
    .slice(0, 16); // 16char hex is enough for no-collision within a workspace
}

export interface ManagedAsset {
  identity: AssetIdentity;
  lineage: AssetLineage;
  metadata: AssetMetadata;
  attributes: Record<string, any>; // Type-specific extra data
}
