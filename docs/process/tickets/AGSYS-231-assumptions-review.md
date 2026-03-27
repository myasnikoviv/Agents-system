# AGSYS-231 Assumptions Review

## Ticket
- ID: `AGSYS-231`
- Pipeline: `bug-fix`

## Assumptions
1. Right panel non-scroll behavior is caused by flex/min-height container constraints rather than data volume logic.
2. A layout-only change in Cockpit page classes is sufficient to restore expected scroll.
3. No backend changes are required for this fix.

## Validation Plan
- Adjust right panel container constraints (`min-h-0`, `overflow-hidden`) and keep inner content wrapper as `overflow-y-auto`.
- Verify by adding enough event cards and checking vertical scroll in the right panel only.
- Verify center chat panel behavior remains unaffected.

## Risks
- Wrong placement of `min-h-0` can break sibling layout or cause nested double-scroll.
- Tailwind utility regression risk if class change is applied to wrong container.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T19:09:00+01:00
