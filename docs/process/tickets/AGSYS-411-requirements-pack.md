# Requirements Pack: AGSYS-411 (Validation Rules & Wrapper)

## Objective
Implement the "Verification Wrapper" that constrains the validator agent (QA) to strictly verify the acceptance criteria.

## Acceptable Criteria
1. Specialized prompt fragment in `tdd-qa.md` for `VERIFICATION` mode.
2. Mandatory output format: MUST produce a `VerificationReport` JSON block.
3. Verification rules include:
   - Match against original `acceptanceCriteria`.
   - Evidence check (must link to a test report or CLI log).
   - "Deep audit" link for manual override.

## Verification
- Validator agent produces valid `VerificationReport` in a simulated verification turn.
