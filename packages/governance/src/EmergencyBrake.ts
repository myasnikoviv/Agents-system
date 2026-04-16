import { GovernanceEngineContext } from './GovernanceEngineTypes';

export function isGlobalGovernanceDisabled(): boolean {
  return String(process.env.GOVERNANCE_DISABLE_ALL || '').toLowerCase() === 'true';
}

export function isBypassAllowed(ctx: GovernanceEngineContext): boolean {
  const expected = String(process.env.GOVERNANCE_BYPASS_TOKEN || '').trim();
  if (!expected) return false;
  return String(ctx.bypassToken || '').trim() === expected;
}
