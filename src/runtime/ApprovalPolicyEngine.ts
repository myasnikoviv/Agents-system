export type ApprovalPolicyMode = 'git-only' | 'strict';

const STRICT_INTERRUPTS = ['research', 'qa', 'git'] as const;
const GIT_ONLY_INTERRUPTS = ['git'] as const;

function normalizeNodeName(input: string): string {
  return String(input || '').trim().toLowerCase();
}

export function resolveApprovalPolicyMode(): ApprovalPolicyMode {
  const raw = String(process.env.PILOT_APPROVAL_POLICY_MODE || '')
    .trim()
    .toLowerCase();
  if (raw === 'strict') return 'strict';
  return 'git-only';
}

export function resolveInterruptBeforeNodes(): string[] {
  const override = String(process.env.PILOT_APPROVAL_INTERRUPT_BEFORE || '').trim();
  if (override) {
    const parsed = override
      .split(',')
      .map(normalizeNodeName)
      .filter(Boolean);
    if (parsed.length > 0) return Array.from(new Set(parsed));
  }

  const mode = resolveApprovalPolicyMode();
  return mode === 'strict' ? [...STRICT_INTERRUPTS] : [...GIT_ONLY_INTERRUPTS];
}

