# TDD QA Day-1 Findings

## Summary
Tests are numerous, but organization and discoverability are weak. Risk: duplicated intent and incomplete regression contracts for sensitive strategy blocks.

## Findings
1. Multiple test roots increase maintenance friction.
2. No single regression matrix file for wave/effort/wait/manip/volatility chain.
3. Historical bug scenarios are discussed in chat/reports but not consistently normalized into named fixtures.

## Recommendations
1. Introduce canonical regression matrix for strategy chain.
2. Add fixture naming standard with timestamp + scenario tag.
3. Add mandatory red-test template for every bug ticket.

## Proposed Tickets
- QA-201 Regression Matrix for Strategy #2 Chain
- QA-202 Fixture Naming Convention + Migration
- QA-203 Mandatory Bug Repro Template
