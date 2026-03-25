# Approval Policy Matrix

## Default Mode
- Policy mode: `git-only`
- Env: `PILOT_APPROVAL_POLICY_MODE=git-only` (default when unset)
- Interrupt gates: `git`

## Strict Mode
- Policy mode: `strict`
- Env: `PILOT_APPROVAL_POLICY_MODE=strict`
- Interrupt gates: `research,qa,git`

## Custom Override
- Env: `PILOT_APPROVAL_INTERRUPT_BEFORE=<comma-separated-node-list>`
- Example: `PILOT_APPROVAL_INTERRUPT_BEFORE=qa,git`
- When override is set, it takes precedence over policy mode.

## Risk Rationale
- `research`, `qa`: non-mutating/low-risk stages, auto-continue by default.
- `git`: mutation/release boundary, manual approval required by default.
