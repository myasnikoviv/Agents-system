# AGSYS-759 — Tool Result Cache (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Cache deterministic tool outputs
- Reuse cached results for repeat calls

## Changes
- Added tool cache module:
  - `src/runtime/optimization/ToolResultCache.ts`
  - policy file support: `docs/runtime/adaptive/tool-cache-policy.json`
  - deterministic cache key: scope + tenant/workspace + tool + args
  - TTL support
- Integrated into workbench execution path:
  - `src/runtime/WorkbenchGateway.ts`
  - for cacheable deterministic tools: checks cache before execution
  - on hit returns cached content and emits `cache_hit` telemetry
  - on success writes result to cache
- Cacheability contract:
  - tool must be allowlisted
  - tool policy risk must be `safe` (mutable/unsafe are excluded)

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/tool_result_cache.test.ts src/runtime/__tests__/llm_response_cache.test.ts
```
Result:
- Pass (2 suites, 4 tests).

2. Verified outcomes:
- deterministic tool call with same args -> cache hit reuse
- mutable tool policies are not cacheable
